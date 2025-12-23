"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function TermsPage() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-background text-foreground p-8 md:p-20 font-sans">
            <div className="max-w-3xl mx-auto">
                <Link href="/signup" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-12 group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    {t('common.cancel') || 'Geri Dön'}
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight leading-tight uppercase">KULLANIM KOŞULLARI</h1>
                        <p className="text-primary font-bold text-sm tracking-widest uppercase mt-1">Favduck (Terms of Use)</p>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
                    <p className="text-sm font-medium border-l-2 border-primary pl-4 py-1 italic">
                        Son Güncelleme: 23 Aralık 2025
                    </p>

                    <p>
                        Bu Kullanım Koşulları (“Koşullar”), Ali Çağatay Can Coşkun tarafından işletilen <span className="text-foreground font-bold">favduck.com</span> internet sitesi ve ilişkili hizmetlerin (birlikte “Hizmet”) kullanımını düzenler. Hizmeti kullanarak bu Koşulları kabul etmiş olursunuz. Kabul etmiyorsanız Hizmeti kullanmayınız.
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">1) Tanımlar</h2>
                        <ul className="list-disc list-outside ml-5 space-y-2">
                            <li><span className="text-foreground font-bold">Kullanıcı / Siz:</span> Hizmeti kullanan kişi.</li>
                            <li><span className="text-foreground font-bold">İçerik:</span> Ürün linkleri, görseller, başlıklar, fiyat/stok verileri, açıklamalar, notlar, koleksiyon isimleri vb.</li>
                            <li><span className="text-foreground font-bold">Üçüncü Taraf:</span> Favduck.com dışında kalan mağazalar, pazar yerleri, web siteleri, uygulamalar.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">2) Hizmetin Kapsamı</h2>
                        <p>Favduck.com; ürün linklerini kaydetme, koleksiyon oluşturma, fiyat/stok değişimlerini takip etme ve belirli bildirim/uyarılar alma konusunda bir listeleme ve takip aracıdır.</p>
                        <div className="bg-surface p-6 rounded-2xl border border-border space-y-4 text-sm mt-4">
                            <p>• Favduck.com ürün satmaz; kargo/iade süreçlerini yürütmez.</p>
                            <p>• Mağazalarla aranızdaki satış sözleşmesinin tarafı değildir.</p>
                            <p>• Ürün fiyatı/stok/özellik bilgilerini üçüncü taraf kaynaklardan otomatik veya manuel yöntemlerle toplayabilir; bu veriler gecikmeli, eksik veya hatalı olabilir.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">3) Uygunluk ve Hesap</h2>
                        <p>Hizmeti kullanmak için en az 18 yaşında olmanız (veya bulunduğunuz yerde yasal yaş) gerekir. Hesabınızın güvenliğinden ve hesabınız üzerinden yapılan işlemlerden siz sorumlusunuz.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">4) Kullanıcı Yükümlülükleri</h2>
                        <p>Hizmeti kullanırken yasalara uygun hareket edeceğinizi, başkalarının haklarını ihlal etmeyeceğinizi ve hizmetin işleyişini bozmayacağınızı kabul edersiniz.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">5) Yasaklı Kullanımlar</h2>
                        <p>Yetkisiz erişim denemeleri, bot faaliyetleri, reverse engineering, aldatıcı kullanım ve başkalarının hesabına izinsiz erişim kesinlikle yasaktır.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">6) Fiyat, Stok ve Bildirimlerin Doğası</h2>
                        <p className="bg-danger/5 p-4 rounded-xl border border-danger/20 text-sm">
                            Fiyat/stok verileri garanti edilmez. Nihai bilgi her zaman ilgili mağazanın sayfasındaki veridir. Uyarılar/bildirimler teknik sebeplerle gecikebilir veya ulaşmayabilir.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">7) Üçüncü Taraf Siteler ve Linkler</h2>
                        <p>Hizmet, üçüncü taraf sitelere yönlendiren linkler içerebilir. Üçüncü taraf sitelerin içerik ve politikalarından Favduck sorumlu değildir.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">8) Fikri Mülkiyet</h2>
                        <p>Favduck’a ait yazılım, tasarım, logo ve marka unsurları yazılı izin olmadan kopyalanamaz ve dağıtılamaz.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">12) Hesabın Askıya Alınması ve Fesih</h2>
                        <p>Koşulları ihlal etmeniz halinde hesabınız askıya alınabilir. Hesabınızı dilediğiniz zaman silebilirsiniz: <span className="text-primary font-bold">Profil &gt; Ayarlar &gt; Hesabımı Sil</span>.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">17) Uygulanacak Hukuk ve Yetki</h2>
                        <p>Koşullar Türkiye hukukuna tabidir. Uyuşmazlıklarda İstanbul (Merkez) Mahkemeleri ve İcra Daireleri yetkilidir.</p>
                    </section>

                    <section className="bg-primary/5 p-8 rounded-3xl border border-primary/20 space-y-4">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <span className="text-primary">18)</span> İletişim
                        </h2>
                        <div className="text-sm space-y-1">
                            <p><span className="font-bold text-foreground">E-posta:</span> info@favduck.com</p>
                            <p><span className="font-bold text-foreground">İşleten:</span> Ali Çağatay Can Coşkun (Favduck)</p>
                            <p><span className="font-bold text-foreground">Adres:</span> Muğla/Türkiye</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
