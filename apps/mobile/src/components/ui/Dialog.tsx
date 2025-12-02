import React from 'react'
import { View, Text, Modal, Pressable, ModalProps } from 'react-native'
import { X } from 'lucide-react-native'

interface DialogProps extends Omit<ModalProps, 'children'> {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

interface DialogHeaderProps {
  children: React.ReactNode
  onClose?: () => void
  showCloseButton?: boolean
  className?: string
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, children, ...props }: DialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      {...props}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center px-4"
        onPress={onClose}
      >
        <Pressable
          className="bg-white rounded-xl w-full max-w-md overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function DialogHeader({
  children,
  onClose,
  showCloseButton = true,
  className = '',
}: DialogHeaderProps) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 pt-4 pb-2 ${className}`}
    >
      <View className="flex-1">{children}</View>
      {showCloseButton && onClose && (
        <Pressable
          onPress={onClose}
          className="p-1 -mr-1 rounded-full active:bg-gray-100"
        >
          <X size={20} color="#6b7280" />
        </Pressable>
      )}
    </View>
  )
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  return (
    <Text className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </Text>
  )
}

export function DialogDescription({
  children,
  className = '',
}: DialogDescriptionProps) {
  return (
    <Text className={`text-sm text-gray-500 mt-1 ${className}`}>{children}</Text>
  )
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  return <View className={`px-4 py-3 ${className}`}>{children}</View>
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return (
    <View
      className={`flex-row items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 ${className}`}
    >
      {children}
    </View>
  )
}

export default Dialog
