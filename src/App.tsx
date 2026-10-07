import { RouterProvider } from 'react-router/dom'
import { ToastProvider } from './components/ui/ToastProvider'
import { router } from './router'

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
