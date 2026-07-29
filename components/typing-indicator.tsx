import { motion } from 'framer-motion'

interface TypingIndicatorProps {
  userNames: string[]
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null

  const displayText = 
    userNames.length === 1
      ? `${userNames[0]} está escribiendo`
      : userNames.length === 2
      ? `${userNames[0]} y ${userNames[1]} están escribiendo`
      : `${userNames[0]} y ${userNames.length - 1} más están escribiendo`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground"
    >
      <div className="flex items-center gap-1">
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          className="size-1.5 rounded-full bg-muted-foreground"
        />
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="size-1.5 rounded-full bg-muted-foreground"
        />
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          className="size-1.5 rounded-full bg-muted-foreground"
        />
      </div>
      <span className="text-xs">{displayText}</span>
    </motion.div>
  )
}
