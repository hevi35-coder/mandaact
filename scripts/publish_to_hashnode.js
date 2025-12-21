const fs = require('fs')
const path = require('path')
const https = require('https')

const DRAFT_PATH = path.join(__dirname, '../docs/marketing/DEVTO_CONTENT_DRAFTS.md')

function loadEnvFromDotenvLocal() {
  const envPath = path.join(__dirname, '../.env.local')
  if (!fs.existsSync(envPath)) return
  const envContent = fs.readFileSync(envPath, 'utf8')
  const pairs = envContent.split('\n').filter((line) => line.includes('='))
  for (const pair of pairs) {
    const match = pair.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    const key = match[1]
    const value = match[2]
    if (!process.env[key] && value) {
      process.env[key] = value.trim()
    }
  }
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith('---')) return { frontmatter: {}, body: markdown }
  const endIndex = markdown.indexOf('\n---', 3)
  if (endIndex === -1) return { frontmatter: {}, body: markdown }
  const raw = markdown.slice(3, endIndex).trim()
  const body = markdown.slice(endIndex + '\n---'.length).trimStart()

  const frontmatter = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let value = m[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  }

  if (frontmatter.tags) {
    frontmatter.tags = frontmatter.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return { frontmatter, body }
}

function requestHashnode(payload, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const req = https.request(
      {
        hostname: 'gql.hashnode.com',
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: token,
          'User-Agent': 'MandaAct-Publisher/1.0',
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            resolve({ statusCode: res.statusCode, body: parsed })
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data.slice(0, 2000)}`))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  loadEnvFromDotenvLocal()

  const token = process.env.HASHNODE_TOKEN
  const publicationId = process.env.HASHNODE_PUBLICATION_ID

  if (!token) {
    console.error('❌ HASHNODE_TOKEN is not set. Add it to .env.local or export it.')
    process.exit(1)
  }
  if (!publicationId) {
    console.error('❌ HASHNODE_PUBLICATION_ID is not set. Add it to .env.local or export it.')
    process.exit(1)
  }
  if (!fs.existsSync(DRAFT_PATH)) {
    console.error(`❌ Draft file not found: ${DRAFT_PATH}`)
    process.exit(1)
  }

  const content = fs.readFileSync(DRAFT_PATH, 'utf8')
  const { frontmatter, body } = parseFrontmatter(content)

  const title = frontmatter.title
  if (!title || String(title).length < 6) {
    console.error('❌ Frontmatter `title` is required for Hashnode (min length 6).')
    process.exit(1)
  }

  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.map((name) => ({ name }))
    : undefined

  const mutation = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post { id url slug }
      }
    }
  `

  const variables = {
    input: {
      title,
      subtitle: frontmatter.description || undefined,
      publicationId,
      contentMarkdown: body,
      originalArticleURL: frontmatter.canonical_url || undefined,
      tags,
      coverImageOptions: frontmatter.cover_image
        ? { coverImageURL: frontmatter.cover_image }
        : undefined,
    },
  }

  console.log('🚀 Publishing to Hashnode...')
  const { statusCode, body: response } = await requestHashnode(
    { query: mutation, variables },
    token
  )

  if (response.errors?.length) {
    console.error(`❌ Hashnode returned errors (HTTP ${statusCode})`)
    console.error(JSON.stringify(response.errors, null, 2))
    process.exit(1)
  }

  const post = response.data?.publishPost?.post
  if (!post?.url) {
    console.error(`❌ Unexpected response (HTTP ${statusCode})`)
    console.error(JSON.stringify(response, null, 2))
    process.exit(1)
  }

  console.log('✅ Success! Post published.')
  console.log(`   URL: ${post.url}`)
  console.log(`   ID:  ${post.id}`)
}

main().catch((e) => {
  console.error('❌ Failed:', e)
  process.exit(1)
})

