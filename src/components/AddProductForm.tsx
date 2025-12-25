"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addProduct } from "@/actions/product-actions";
import { Loader2, Plus } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// Initial State
const initialState = {
    success: false,
    message: "",
};

function SubmitButton() {
    const { pending } = useFormStatus();
    const { t } = useLanguage();

    return (
        <button
            type="submit"
            disabled={pending}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            {pending ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('common.adding')}
                </>
            ) : (
                <>
                    <Plus className="w-4 h-4" />
                    {t('common.add')}
                </>
            )}
        </button>
    );
}

export function AddProductForm() {
    const [state, formAction] = useActionState(addProduct, initialState);
    const { t } = useLanguage();

    return (
        <div className="w-full max-w-xl mx-auto p-4 bg-white rounded-lg shadow-sm border mb-8">
            <form action={formAction} className="flex gap-2">
                <input
                    type="url"
                    name="url"
                    placeholder={t('common.placeholder_url')}
                    required
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <SubmitButton />
            </form>

            {state?.message && (
                <div className={`mt-3 p-3 text-sm rounded-md ${state.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {state.message}
                </div>
            )}
        </div>
    );
}
