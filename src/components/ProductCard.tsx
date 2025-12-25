import React from "react";
import { Trash2, ExternalLink } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface ProductCardProps {
    title: string;
    image: string;
    price: string;
    url: string;
    onRemove?: () => void;
    showRemove?: boolean;
}

export const ProductCard = ({
    title,
    image,
    price,
    url,
    onRemove,
    showRemove = false,
}: ProductCardProps) => {
    const { t } = useLanguage();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="relative aspect-video w-full overflow-hidden bg-slate-50">
                {image ? (
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src =
                                "https://placehold.co/600x400/f1f5f9/94a3b8?text=No+Image";
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                        {t('common.no_image')}
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="font-semibold text-slate-900 line-clamp-2 md:text-lg mb-2" title={title}>
                    {title}
                </h3>

                <div className="flex items-center justify-between mt-4">
                    <span className="text-emerald-600 font-bold text-lg">{price}</span>

                    <div className="flex gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                            title={t('common.open_link')}
                        >
                            <ExternalLink size={20} />
                        </a>
                        {showRemove && onRemove && (
                            <button
                                onClick={onRemove}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                title={t('common.remove')}
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
