import React, { useCallback, useState } from 'react'
import { View, StyleSheet, LayoutChangeEvent } from 'react-native'
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'

interface SortableListProps<T> {
  data: T[]
  keyExtractor: (item: T) => string
  renderItem: (info: { item: T; index: number; drag: () => void }) => React.ReactNode
  onDragEnd: (data: T[]) => void
  itemHeight: number
}

interface DraggableItemProps {
  children: React.ReactNode
  index: number
  itemHeight: number
  itemCount: number
  onDragStart: (index: number) => void
  onDragMove: (index: number, translationY: number) => void
  onDragEnd: (index: number) => void
  isDragging: boolean
  draggedIndex: number | null
  dragOffset: number
}

function DraggableItem({
  children,
  index,
  itemHeight,
  itemCount,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  draggedIndex,
  dragOffset,
}: DraggableItemProps) {
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const zIndex = useSharedValue(0)
  const opacity = useSharedValue(1)

  const gesture = Gesture.Pan()
    .activateAfterLongPress(200) // Only activate after 200ms long press
    .onStart(() => {
      runOnJS(onDragStart)(index)
      scale.value = withSpring(1.02)
      zIndex.value = 100
      opacity.value = 0.9
    })
    .onUpdate((event) => {
      translateY.value = event.translationY
      runOnJS(onDragMove)(index, event.translationY)
    })
    .onEnd(() => {
      translateY.value = withSpring(0)
      scale.value = withSpring(1)
      zIndex.value = 0
      opacity.value = 1
      runOnJS(onDragEnd)(index)
    })

  const animatedStyle = useAnimatedStyle(() => {
    // If this item is being dragged
    if (isDragging && draggedIndex === index) {
      return {
        transform: [
          { translateY: translateY.value },
          { scale: scale.value },
        ],
        zIndex: zIndex.value,
        opacity: opacity.value,
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      }
    }

    // If another item is being dragged, move this item up or down
    if (isDragging && draggedIndex !== null && draggedIndex !== index) {
      const draggedItemPosition = draggedIndex * itemHeight + dragOffset
      const currentItemTop = index * itemHeight
      const currentItemBottom = currentItemTop + itemHeight

      let offset = 0

      if (draggedIndex < index) {
        // Dragged item started above this item
        if (draggedItemPosition + itemHeight / 2 > currentItemTop) {
          offset = -itemHeight
        }
      } else {
        // Dragged item started below this item
        if (draggedItemPosition + itemHeight / 2 < currentItemBottom) {
          offset = itemHeight
        }
      }

      return {
        transform: [
          { translateY: withTiming(offset, { duration: 200 }) },
          { scale: 1 },
        ],
        zIndex: 0,
        opacity: 1,
      }
    }

    return {
      transform: [
        { translateY: withTiming(0, { duration: 200 }) },
        { scale: 1 },
      ],
      zIndex: 0,
      opacity: 1,
    }
  }, [isDragging, draggedIndex, index, dragOffset, itemHeight])

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.item, { height: itemHeight }, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  )
}

export default function SortableList<T>({
  data,
  keyExtractor,
  renderItem,
  onDragEnd,
  itemHeight,
}: SortableListProps<T>) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [items, setItems] = useState(data)

  // Sync items with data prop
  React.useEffect(() => {
    setItems(data)
  }, [data])

  const handleDragStart = useCallback((index: number) => {
    setIsDragging(true)
    setDraggedIndex(index)
    setDragOffset(0)
  }, [])

  const handleDragMove = useCallback((index: number, translationY: number) => {
    setDragOffset(translationY)
  }, [])

  const handleDragEnd = useCallback((index: number) => {
    if (draggedIndex === null) {
      setIsDragging(false)
      return
    }

    // Calculate new index based on drag offset
    const draggedItemPosition = draggedIndex * itemHeight + dragOffset
    let newIndex = Math.round(draggedItemPosition / itemHeight)
    newIndex = Math.max(0, Math.min(newIndex, items.length - 1))

    if (newIndex !== draggedIndex) {
      const newItems = [...items]
      const [movedItem] = newItems.splice(draggedIndex, 1)
      newItems.splice(newIndex, 0, movedItem)
      setItems(newItems)
      onDragEnd(newItems)
    }

    setIsDragging(false)
    setDraggedIndex(null)
    setDragOffset(0)
  }, [draggedIndex, dragOffset, itemHeight, items, onDragEnd])

  const renderDraggableItem = useCallback(
    (item: T, index: number) => {
      const drag = () => {
        // This is a placeholder - actual drag is handled by gesture
      }

      return (
        <DraggableItem
          key={keyExtractor(item)}
          index={index}
          itemHeight={itemHeight}
          itemCount={items.length}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          isDragging={isDragging}
          draggedIndex={draggedIndex}
          dragOffset={dragOffset}
        >
          {renderItem({ item, index, drag })}
        </DraggableItem>
      )
    },
    [
      keyExtractor,
      itemHeight,
      items.length,
      handleDragStart,
      handleDragMove,
      handleDragEnd,
      isDragging,
      draggedIndex,
      dragOffset,
      renderItem,
    ]
  )

  return (
    <View style={[styles.container, { minHeight: items.length * itemHeight }]}>
      {items.map((item, index) => renderDraggableItem(item, index))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  item: {
    width: '100%',
  },
})
