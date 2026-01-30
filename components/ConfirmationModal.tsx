"use client"

import { X, AlertTriangle, Info } from "lucide-react"

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: "danger" | "info"
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "info"
}: ConfirmationModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded ${type === "danger" ? "bg-red-100" : "bg-blue-100"}`}>
                            {type === "danger" ? (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            ) : (
                                <Info className="h-5 w-5 text-blue-600" />
                            )}
                        </div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                    </div>
                    <button className="p-1 hover:bg-slate-100 rounded" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4">
                    <p className="text-slate-600">{message}</p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t bg-slate-50">
                    <button
                        className="px-4 py-2 text-slate-700 hover:bg-gray-200 rounded transition-colors"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`px-4 py-2 text-white rounded shadow-sm transition-colors ${type === "danger"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        onClick={() => {
                            onConfirm()
                            onClose()
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
