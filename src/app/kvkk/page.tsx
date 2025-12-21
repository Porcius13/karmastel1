import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function KVKKPage() {
    return (
        <div className="min-h-screen bg-background p-8 md:p-24 font-sans text-foreground">
            <div className="max-w-3xl mx-auto">
                <Link href="/signup" className="inline-flex items-center gap-2 text-primary hover:underline mb-8 font-bold">
                    <ArrowLeft size={20} /> Geri Dön
                </Link>

                <h1 className="text-4xl font-black mb-8 tracking-tight">Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni</h1>

                <div className="space-y-6 text-muted-foreground leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">1. Veri Sorumlusu</h2>
                        <p>Favduck olarak, kullanıcılarımızın kişisel verilerinin güvenliğini ciddiye alıyor ve 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında gerekli tedbirleri alıyoruz.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">2. Kişisel Verilerin İşlenme Amacı</h2>
                        <p>Kişisel verileriniz, platformumuzun sunduğu hizmetlerden yararlanabilmeniz, hesap güvenliğinizin sağlanması ve size daha iyi bir deneyim sunulabilmesi amacıyla işlenmektedir.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">3. İşlenen Veriler</h2>
                        <p>Kayıt sırasında paylaştığınız ad, soyad, e-posta adresi ve kullanıcı adı gibi veriler işlenmektedir.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">4. Haklarınız</h2>
                        <p>KVKK kapsamında verilerinizin silinmesini talep etme, işlenip işlenmediğini öğrenme ve düzeltilmesini isteme haklarına sahipsiniz.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
