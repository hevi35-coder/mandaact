import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MandalartGrid from '../MandalartGrid'
import type { MandalartGridData } from '@/types'

describe('MandalartGrid', () => {
  const createTestData = (filled = true): MandalartGridData => {
    if (!filled) {
      return {
        center_goal: '',
        sub_goals: [],
      }
    }

    return {
      center_goal: '핵심 목표',
      sub_goals: [
        {
          id: 'sg-1',
          mandalart_id: 'm-1',
          title: '세부 목표 1',
          position: 1,
          created_at: new Date().toISOString(),
          actions: [
            { id: 'a-1-1', sub_goal_id: 'sg-1', title: '실천 1-1', type: 'routine', frequency: 'daily', position: 0, created_at: new Date().toISOString() },
            { id: 'a-1-2', sub_goal_id: 'sg-1', title: '실천 1-2', type: 'routine', frequency: 'daily', position: 1, created_at: new Date().toISOString() },
            { id: 'a-1-3', sub_goal_id: 'sg-1', title: '실천 1-3', type: 'mission', position: 2, created_at: new Date().toISOString() },
            { id: 'a-1-4', sub_goal_id: 'sg-1', title: '실천 1-4', type: 'routine', frequency: 'daily', position: 3, created_at: new Date().toISOString() },
            { id: 'a-1-5', sub_goal_id: 'sg-1', title: '실천 1-5', type: 'routine', frequency: 'daily', position: 4, created_at: new Date().toISOString() },
            { id: 'a-1-6', sub_goal_id: 'sg-1', title: '실천 1-6', type: 'mission', position: 5, created_at: new Date().toISOString() },
            { id: 'a-1-7', sub_goal_id: 'sg-1', title: '실천 1-7', type: 'routine', frequency: 'daily', position: 6, created_at: new Date().toISOString() },
            { id: 'a-1-8', sub_goal_id: 'sg-1', title: '실천 1-8', type: 'routine', frequency: 'daily', position: 7, created_at: new Date().toISOString() },
          ],
        },
        {
          id: 'sg-2',
          mandalart_id: 'm-1',
          title: '세부 목표 2',
          position: 2,
          created_at: new Date().toISOString(),
          actions: [
            { id: 'a-2-1', sub_goal_id: 'sg-2', title: '실천 2-1', type: 'routine', frequency: 'daily', position: 0, created_at: new Date().toISOString() },
            { id: 'a-2-2', sub_goal_id: 'sg-2', title: '실천 2-2', type: 'routine', frequency: 'daily', position: 1, created_at: new Date().toISOString() },
            { id: 'a-2-3', sub_goal_id: 'sg-2', title: '실천 2-3', type: 'mission', position: 2, created_at: new Date().toISOString() },
            { id: 'a-2-4', sub_goal_id: 'sg-2', title: '실천 2-4', type: 'routine', frequency: 'daily', position: 3, created_at: new Date().toISOString() },
            { id: 'a-2-5', sub_goal_id: 'sg-2', title: '실천 2-5', type: 'routine', frequency: 'daily', position: 4, created_at: new Date().toISOString() },
            { id: 'a-2-6', sub_goal_id: 'sg-2', title: '실천 2-6', type: 'mission', position: 5, created_at: new Date().toISOString() },
            { id: 'a-2-7', sub_goal_id: 'sg-2', title: '실천 2-7', type: 'routine', frequency: 'daily', position: 6, created_at: new Date().toISOString() },
            { id: 'a-2-8', sub_goal_id: 'sg-2', title: '실천 2-8', type: 'routine', frequency: 'daily', position: 7, created_at: new Date().toISOString() },
          ],
        },
      ],
    }
  }

  it('renders 9 sections in 3x3 grid', () => {
    const data = createTestData()
    const { container } = render(<MandalartGrid mode="view" data={data} />)

    // Should have 9 sections (each section has grid-cols-3 grid-rows-3)
    const sections = container.querySelectorAll('.grid.grid-cols-3.grid-rows-3')
    expect(sections).toHaveLength(9)
  })

  it('displays center goal in the center cell', () => {
    const data = createTestData()
    render(<MandalartGrid mode="view" data={data} />)

    expect(screen.getByText('핵심 목표')).toBeInTheDocument()
  })

  it('displays sub-goals in center section', () => {
    const data = createTestData()
    render(<MandalartGrid mode="view" data={data} />)

    // Sub-goals should appear multiple times (once in center section, once in their own section)
    expect(screen.getAllByText('세부 목표 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('세부 목표 2').length).toBeGreaterThan(0)
  })

  it('displays actions for each sub-goal', () => {
    const data = createTestData()
    render(<MandalartGrid mode="view" data={data} />)

    // Check some actions are displayed
    expect(screen.getByText('실천 1-1')).toBeInTheDocument()
    expect(screen.getByText('실천 1-2')).toBeInTheDocument()
    expect(screen.getByText('실천 2-1')).toBeInTheDocument()
    expect(screen.getByText('실천 2-2')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const data = createTestData(false)
    const { container } = render(<MandalartGrid mode="view" data={data} />)

    // Should still render 9 sections
    const sections = container.querySelectorAll('.grid.grid-cols-3.grid-rows-3')
    expect(sections).toHaveLength(9)

    // Should not display any text content
    expect(screen.queryByText('핵심 목표')).not.toBeInTheDocument()
  })

  it('shows Plus icon in create mode when center goal is empty', () => {
    const data = createTestData(false)
    const { container } = render(<MandalartGrid mode="create" data={data} />)

    // Plus icon should be present
    const plusIcons = container.querySelectorAll('svg')
    expect(plusIcons.length).toBeGreaterThan(0)
  })

  it('calls onCoreGoalClick when center goal is clicked', async () => {
    const data = createTestData()
    const onCoreGoalClick = vi.fn()
    const user = userEvent.setup()

    render(<MandalartGrid mode="view" data={data} onCoreGoalClick={onCoreGoalClick} />)

    const centerGoal = screen.getByText('핵심 목표')
    await user.click(centerGoal)

    expect(onCoreGoalClick).toHaveBeenCalledOnce()
  })

  it('calls onSectionClick when outer section is clicked', async () => {
    const data = createTestData()
    const onSectionClick = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <MandalartGrid mode="view" data={data} onSectionClick={onSectionClick} />
    )

    // Find an outer section (not the center one)
    const sections = container.querySelectorAll('.grid.grid-cols-3.grid-rows-3')
    // The first section in the DOM should be position 1 (top-left)
    const firstSection = sections[0]

    await user.click(firstSection)

    expect(onSectionClick).toHaveBeenCalledWith(1)
  })

  it('does not call click handlers when readonly is true', async () => {
    const data = createTestData()
    const onCoreGoalClick = vi.fn()
    const onSectionClick = vi.fn()
    const user = userEvent.setup()

    render(
      <MandalartGrid
        mode="view"
        data={data}
        onCoreGoalClick={onCoreGoalClick}
        onSectionClick={onSectionClick}
        readonly
      />
    )

    const centerGoal = screen.getByText('핵심 목표')
    await user.click(centerGoal)

    expect(onCoreGoalClick).not.toHaveBeenCalled()
    expect(onSectionClick).not.toHaveBeenCalled()
  })

  it('applies forDownload styling when forDownload is true', () => {
    const data = createTestData()
    const { container } = render(<MandalartGrid mode="view" data={data} forDownload />)

    // Check for larger text sizes (download mode uses larger fonts)
    const centerGoal = screen.getByText('핵심 목표')
    expect(centerGoal.className).toContain('text-6xl')
  })

  it('applies forMobile styling when forMobile is true', () => {
    const data = createTestData()
    const { container } = render(<MandalartGrid mode="view" data={data} forMobile />)

    // Check for smaller text sizes (mobile mode uses text-lg for center goal)
    const centerGoal = screen.getByText('핵심 목표')
    expect(centerGoal.className).toContain('text-lg')
  })

  it('hides center section when hideCenterGoal is true', () => {
    const data = createTestData()
    const { container } = render(<MandalartGrid mode="view" data={data} hideCenterGoal />)

    // Center goal text should not be visible
    expect(screen.queryByText('핵심 목표')).not.toBeInTheDocument()

    // Should have invisible section
    const invisibleSections = container.querySelectorAll('.invisible')
    expect(invisibleSections.length).toBeGreaterThan(0)
  })

  it('renders all 81 cells (9 sections × 9 cells)', () => {
    const data = createTestData()
    const { container } = render(<MandalartGrid mode="view" data={data} />)

    // Each section has 9 cells with aspect-square class
    const cells = container.querySelectorAll('.aspect-square')
    expect(cells).toHaveLength(81)
  })

  it('applies hover effects in interactive mode', () => {
    const data = createTestData()
    const { container } = render(
      <MandalartGrid mode="view" data={data} onSectionClick={vi.fn()} />
    )

    // Outer sections should have hover ring effect
    const sections = container.querySelectorAll('.grid.grid-cols-3.grid-rows-3')
    const firstOuterSection = sections[0]

    expect(firstOuterSection.className).toContain('hover:ring-2')
    expect(firstOuterSection.className).toContain('cursor-pointer')
  })
})
