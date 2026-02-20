import { useEffect, useRef } from 'react'
import { getSocket } from '../socket/socket'

export function useSocket<T = unknown>(
  event: string,
  callback: (data: T) => void,
  deps: unknown[] = []
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = (data: T) => callbackRef.current(data)
    socket.on(event, handler)

    return () => {
      socket.off(event, handler)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps])
}
