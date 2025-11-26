import React, { forwardRef } from 'react'
import { View, Text, TextInput, TextInputProps } from 'react-native'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
  className?: string
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, disabled = false, className = '', ...props }, ref) => {
    const hasError = !!error

    return (
      <View className={`${className}`}>
        {label && (
          <Text className="text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          className={`
            px-4 py-3 rounded-lg border bg-white text-base text-gray-900
            ${hasError ? 'border-red-500' : 'border-gray-300'}
            ${disabled ? 'opacity-50 bg-gray-100' : ''}
          `}
          placeholderTextColor="#9ca3af"
          editable={!disabled}
          {...props}
        />
        {error && (
          <Text className="text-xs text-red-500 mt-1">{error}</Text>
        )}
        {hint && !error && (
          <Text className="text-xs text-gray-500 mt-1">{hint}</Text>
        )}
      </View>
    )
  }
)

Input.displayName = 'Input'

export default Input
