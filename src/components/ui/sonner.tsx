"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-500",
          actionButton:
            "group-[.toast]:bg-gray-900 group-[.toast]:text-gray-50 font-medium",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500 font-medium",
          success: "group-[.toast]:text-green-600",
          error: "group-[.toast]:text-red-600",
          info: "group-[.toast]:text-blue-600",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
