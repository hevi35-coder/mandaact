import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActionTypeSelector from '../ActionTypeSelector'
import { renderWithProviders } from '@/test/utils/render'
import * as actionTypes from '@/lib/actionTypes'

// Mock actionTypes module
vi.mock('@/lib/actionTypes', async () => {
  const actual = await vi.importActual('@/lib/actionTypes')
  return {
    ...actual,
    suggestActionType: vi.fn(),
  }
})

describe('ActionTypeSelector', () => {
  const mockOnSave = vi.fn()
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default AI suggestion
    vi.mocked(actionTypes.suggestActionType).mockReturnValue({
      type: 'routine',
      confidence: 'high',
      reason: 'actionType.selector.reasonRoutine',
    })
  })

  it('renders dialog when open is true', () => {
    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="매일 운동하기"
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('실천 항목 타입 설정')).toBeInTheDocument()
    expect(screen.getByText('"매일 운동하기"의 타입과 세부 설정을 선택하세요')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    renderWithProviders(
      <ActionTypeSelector
        open={false}
        onOpenChange={mockOnOpenChange}
        actionTitle="매일 운동하기"
        onSave={mockOnSave}
      />
    )

    expect(screen.queryByText('실천 항목 타입 설정')).not.toBeInTheDocument()
  })

  it('shows AI suggestion when provided', async () => {
    vi.mocked(actionTypes.suggestActionType).mockReturnValue({
      type: 'routine',
      confidence: 'high',
      reason: 'actionType.selector.reasonRoutine',
    })

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="매일 운동하기"
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/자동 추천:/)).toBeInTheDocument()
      expect(screen.getByText(/반복적으로 하는 실천\(루틴\)으로 보여요/)).toBeInTheDocument()
    })
  })

  it('displays all three action type options', () => {
    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="테스트"
        onSave={mockOnSave}
      />
    )

    expect(screen.getByLabelText(/루틴/)).toBeInTheDocument()
    expect(screen.getByLabelText(/미션/)).toBeInTheDocument()
    expect(screen.getByLabelText(/참고/)).toBeInTheDocument()
  })

  it('allows selecting routine type and configuring daily frequency', async () => {
    const _user = userEvent.setup()

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="매일 운동하기"
        onSave={mockOnSave}
      />
    )

    // Routine should be selected by default (from AI suggestion)
    const routineRadio = screen.getByLabelText(/루틴/)
    expect(routineRadio).toBeChecked()

    // Should show routine settings
    expect(screen.getByText('루틴 설정')).toBeInTheDocument()
    expect(screen.getByText('반복 주기')).toBeInTheDocument()
  })

  it('allows selecting mission type and configuring once completion', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="책 1권 읽기"
        onSave={mockOnSave}
      />
    )

    // Select mission type
    const missionRadio = screen.getByLabelText(/미션/)
    await user.click(missionRadio)

    // Should show mission settings
    await waitFor(() => {
      expect(screen.getByText('미션 설정')).toBeInTheDocument()
    })

    expect(screen.getByText('완료 방식')).toBeInTheDocument()
    expect(screen.getByLabelText(/1회 완료/)).toBeInTheDocument()
  })

  it('shows reference info when reference type is selected', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="항상 긍정적으로 생각하기"
        onSave={mockOnSave}
      />
    )

    // Select reference type
    const referenceRadio = screen.getByLabelText(/참고/)
    await user.click(referenceRadio)

    // Should show reference info
    await waitFor(() => {
      expect(screen.getByText(/참고 타입은 달성률에 포함되지 않습니다/)).toBeInTheDocument()
    })
  })

  // Note: Complex Select interactions with JSDOM have compatibility issues
  // These tests are better suited for E2E testing with Playwright
  it.skip('allows configuring weekly routine with weekday selection', async () => {
    // Skipped due to JSDOM + Radix UI Select compatibility issues
  })

  it.skip('allows configuring monthly routine with count', async () => {
    // Skipped due to JSDOM + Radix UI Select compatibility issues
  })

  it('allows configuring periodic mission with cycle', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="월간 매출 목표"
        onSave={mockOnSave}
      />
    )

    // Select mission type
    const missionRadio = screen.getByLabelText(/미션/)
    await user.click(missionRadio)

    await waitFor(() => {
      expect(screen.getByText('미션 설정')).toBeInTheDocument()
    })

    // Select periodic completion
    const periodicRadio = screen.getByLabelText(/주기적 목표/)
    await user.click(periodicRadio)

    // Should show period cycle selector
    await waitFor(() => {
      expect(screen.getByText(/반복 주기/)).toBeInTheDocument()
    })
  })

  it('calls onSave with correct data when save button is clicked', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="매일 운동하기"
        onSave={mockOnSave}
      />
    )

    // Click save button
    const saveButton = screen.getByText('저장')
    await user.click(saveButton)

    // Should call onSave with routine data
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'routine',
        routine_frequency: 'daily',
      })
    )

    // Should close dialog
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange when cancel button is clicked', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="매일 운동하기"
        onSave={mockOnSave}
      />
    )

    // Click cancel button
    const cancelButton = screen.getByText('취소')
    await user.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('loads initial data when provided', () => {
    const initialData = {
      type: 'mission' as const,
      mission_completion_type: 'once' as const,
    }

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="책 읽기"
        initialData={initialData}
        onSave={mockOnSave}
      />
    )

    // Mission type should be selected
    const missionRadio = screen.getByLabelText(/미션/)
    expect(missionRadio).toBeChecked()
  })

  it('generates fresh AI suggestion even when editing existing action', async () => {
    const initialData = {
      type: 'mission' as const,
      mission_completion_type: 'once' as const,
    }

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="매일 운동하기"
        initialData={initialData}
        onSave={mockOnSave}
      />
    )

    // AI suggestion should be called
    expect(actionTypes.suggestActionType).toHaveBeenCalledWith('매일 운동하기')

    // Should show AI suggestion
    await waitFor(() => {
      expect(screen.getByText(/자동 추천:/)).toBeInTheDocument()
    })
  })

  it('auto-applies AI suggestion for new actions only', async () => {
    // Test new action (no initialData)
    const { unmount } = renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="매일 운동하기"
        onSave={mockOnSave}
      />
    )

    // Routine should be selected (from AI suggestion)
    const routineRadio = screen.getByLabelText(/루틴/)
    expect(routineRadio).toBeChecked()

    unmount()

    // Test existing action (with initialData)
    vi.mocked(actionTypes.suggestActionType).mockReturnValue({
      type: 'routine',
      confidence: 'high',
      reason: '매일 반복되는 습관',
    })

    const initialData = {
      type: 'mission' as const,
      mission_completion_type: 'once' as const,
    }

    renderWithProviders(
      <ActionTypeSelector
        open={true}
        onOpenChange={mockOnOpenChange}
        actionTitle="책 읽기"
        initialData={initialData}
        onSave={mockOnSave}
      />
    )

    // Mission should remain selected (from initialData, not auto-applied AI suggestion)
    const missionRadio = screen.getByLabelText(/미션/)
    expect(missionRadio).toBeChecked()
  })
})
