import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Monthly Badge Reset Edge Function
 *
 * Purpose:
 * - Resets monthly badges on the 1st of each month
 * - Moves current month records to achievement_unlock_history
 * - Allows users to re-earn monthly badges with repeat XP multiplier
 *
 * Trigger: Cron job - 0 0 1 * * (1st day of month at midnight UTC)
 * Can also be triggered manually via POST request
 */

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with SERVICE_ROLE for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Starting monthly badge reset...')

    // 1. Get all monthly badge achievements
    const { data: monthlyBadges, error: badgeError } = await supabaseAdmin
      .from('achievements')
      .select('id, key, title, badge_type, is_repeatable')
      .eq('badge_type', 'monthly')
      .eq('is_repeatable', true)

    if (badgeError) {
      throw new Error(`Failed to fetch monthly badges: ${badgeError.message}`)
    }

    if (!monthlyBadges || monthlyBadges.length === 0) {
      console.log('No monthly badges found')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No monthly badges to reset',
          badges_reset: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const monthlyBadgeIds = monthlyBadges.map(b => b.id)
    console.log(`Found ${monthlyBadges.length} monthly badges:`, monthlyBadges.map(b => b.key))

    // 2. Get all users who have unlocked monthly badges
    const { data: unlockedMonthly, error: unlockedError } = await supabaseAdmin
      .from('user_achievements')
      .select(`
        id,
        user_id,
        achievement_id,
        unlocked_at,
        achievement:achievements (
          id,
          key,
          title,
          xp_reward,
          repeat_xp_multiplier
        )
      `)
      .in('achievement_id', monthlyBadgeIds)

    if (unlockedError) {
      throw new Error(`Failed to fetch user achievements: ${unlockedError.message}`)
    }

    if (!unlockedMonthly || unlockedMonthly.length === 0) {
      console.log('No user achievements to reset')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No user achievements to reset',
          badges_reset: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Found ${unlockedMonthly.length} user achievements to reset`)

    let successCount = 0
    let errorCount = 0

    // 3. Process each unlocked monthly badge
    for (const userAchievement of unlockedMonthly) {
      try {
        const achievement = userAchievement.achievement as any

        // Get current repeat count from history
        const { data: historyRecords, error: historyError } = await supabaseAdmin
          .from('achievement_unlock_history')
          .select('repeat_count')
          .eq('user_id', userAchievement.user_id)
          .eq('achievement_id', userAchievement.achievement_id)
          .order('repeat_count', { ascending: false })
          .limit(1)

        if (historyError) {
          console.error(`Error fetching history for user ${userAchievement.user_id}:`, historyError)
          errorCount++
          continue
        }

        const currentRepeatCount = historyRecords && historyRecords.length > 0
          ? historyRecords[0].repeat_count
          : 0

        const nextRepeatCount = currentRepeatCount + 1

        // Calculate XP for this repeat (with multiplier)
        const repeatXP = Math.floor(
          achievement.xp_reward * (achievement.repeat_xp_multiplier || 0.5)
        )

        // 4. Move to unlock history
        const { error: insertHistoryError } = await supabaseAdmin
          .from('achievement_unlock_history')
          .insert({
            user_id: userAchievement.user_id,
            achievement_id: userAchievement.achievement_id,
            unlocked_at: userAchievement.unlocked_at,
            xp_awarded: achievement.xp_reward, // Original XP for first unlock
            repeat_count: nextRepeatCount,
            unlock_context: {
              reset_date: new Date().toISOString(),
              reset_type: 'monthly_auto',
              original_unlock: userAchievement.unlocked_at
            }
          })

        if (insertHistoryError) {
          console.error(`Error inserting history for user ${userAchievement.user_id}:`, insertHistoryError)
          errorCount++
          continue
        }

        // 5. Remove from user_achievements (so they can re-earn)
        const { error: deleteError } = await supabaseAdmin
          .from('user_achievements')
          .delete()
          .eq('id', userAchievement.id)

        if (deleteError) {
          console.error(`Error deleting user achievement for user ${userAchievement.user_id}:`, deleteError)
          errorCount++
          continue
        }

        successCount++
        console.log(
          `Reset badge "${achievement.title}" for user ${userAchievement.user_id} (repeat #${nextRepeatCount})`
        )
      } catch (err) {
        console.error(`Error processing user achievement ${userAchievement.id}:`, err)
        errorCount++
      }
    }

    console.log(`Reset complete: ${successCount} success, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monthly badge reset completed',
        badges_reset: successCount,
        errors: errorCount,
        total_badges: monthlyBadges.length,
        total_achievements: unlockedMonthly.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Reset monthly badges error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
