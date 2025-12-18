import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

interface ScrollRevealProps extends HTMLMotionProps<'div'> {
    children: ReactNode
    direction?: 'up' | 'down' | 'left' | 'right' | 'none'
    delay?: number
    duration?: number
    distance?: number
}

/**
 * A reusable wrapper component that animates its children when they enter the viewport.
 */
export default function ScrollReveal({
    children,
    direction = 'up',
    delay = 0,
    duration = 0.6,
    distance = 30,
    className,
    ...props
}: ScrollRevealProps) {
    const getInitialPosition = () => {
        switch (direction) {
            case 'up': return { y: distance, x: 0 }
            case 'down': return { y: -distance, x: 0 }
            case 'left': return { y: 0, x: distance }
            case 'right': return { y: 0, x: -distance }
            case 'none': return { y: 0, x: 0 }
            default: return { y: distance, x: 0 }
        }
    }

    return (
        <motion.div
            initial={{
                opacity: 0,
                ...getInitialPosition()
            }}
            whileInView={{
                opacity: 1,
                x: 0,
                y: 0
            }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
                duration: duration,
                delay: delay,
                ease: [0.21, 0.47, 0.32, 0.98], // Snappy cubic-bezier
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    )
}
