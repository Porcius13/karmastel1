"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function KVKKPage() {
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
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight leading-tight">KVKK AYDINLATMA METNİ</h1>
                        <p className="text-primary font-bold text-sm tracking-widest uppercase mt-1">Favduck</p>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
                    <p className="text-sm font-medium border-l-2 border-primary pl-4 py-1 italic">
                        Son Güncelleme / Yürürlük Tarihi: 23.12.2025
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                            <span className="text-primary">1)</span> Veri Sorumlusu
                        </h2>
                        <div className="bg-surface p-6 rounded-2xl border border-border space-y-2 text-sm">
                            <p><span className="font-bold text-foreground">Veri Sorumlusu:</span> Ali Çağatay Can Coşkun (Favduck)</p>
                            <p><span className="font-bold text-foreground">İnternet Sitesi:</span> favduck.com</p>
                            <p><span className="font-bold text-foreground">E-posta:</span> info@favduck.com</p>
                            <p><span className="font-bold text-foreground">Adres:</span> Muğla/Türkiye</p>
                        </div>
                        <p className="mt-4">
                            İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında veri sorumlusu sıfatıyla hareket eden tarafımızca hazırlanmıştır.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">
                            <span className="text-primary">2)</span> İşlenen Kişisel Veriler
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-foreground font-bold text-sm mb-2">a) Kimlik / İletişim</h3>
                                <p>E-posta (zorunlu), (Varsa) ad-soyad, kullanıcı adı</p>
                            </div>
                            <div>
                                <h3 className="text-foreground font-bold text-sm mb-2">b) Hesap ve Güvenlik</h3>
                                <p>Kullanıcı ID (Firebase UID), oturum bilgileri / tokenlar. Şifre, ham haliyle tarafımızca saklanmaz; kimlik doğrulama süreçleri Firebase altyapısı üzerinden yürütülür.</p>
                            </div>
                            <div>
                                <h3 className="text-foreground font-bold text-sm mb-2">c) Kullanım Verileri</h3>
                                <p>Kaydettiğiniz ürün linkleri, koleksiyonlar, notlar. Alarm tercihleri (fiyat/stok uyarıları), uygulama içi etkileşim kayıtları.</p>
                            </div>
                            <div>
                                <h3 className="text-foreground font-bold text-sm mb-2">d) Cihaz / Teknik Veriler</h3>
                                <p>IP adresi, tarayıcı/cihaz bilgisi, log kayıtları. Çerezler veya benzeri teknolojilerden elde edilen teknik veriler.</p>
                            </div>
                            <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl text-xs">
                                Favduck, ödeme bilgisi, kimlik numarası gibi yüksek riskli verileri talep etmeyi amaçlamaz; bu tür verileri paylaşmamanızı öneririz.
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">
                            <span className="text-primary">3)</span> Kişisel Verilerin İşlenme Amaçları
                        </h2>
                        <ul className="list-disc list-outside ml-5 space-y-2">
                            <li>Hesap oluşturma, giriş ve kullanıcı yönetimi</li>
                            <li>Favori ürün/linkleri kaydetme, koleksiyon oluşturma ve yönetme</li>
                            <li>Fiyat/stok değişimlerinin izlenmesi ve hizmet bildirimlerinin gönderilmesi</li>
                            <li>Hizmet güvenliğinin sağlanması, kötüye kullanımın önlenmesi</li>
                            <li>Hata ayıklama, performans izleme ve hizmet kalitesinin artırılması (Sentry)</li>
                            <li>Hukuki yükümlülüklerin yerine getirilmesi</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">
                            <span className="text-primary">4)</span> Hukuki Sebepler
                        </h2>
                        <p>KVKK m.5 kapsamında kişisel verileriniz aşağıdaki hukuki sebeplere dayanarak işlenebilir:</p>
                        <ul className="list-disc list-outside ml-5 space-y-2 mt-2">
                            <li><span className="text-foreground font-medium">Sözleşmenin kurulması/ifası:</span> Hizmetin sunulması.</li>
                            <li><span className="text-foreground font-medium">Hukuki yükümlülük:</span> Mevzuattan doğan yasal zorunluluklar.</li>
                            <li><span className="text-foreground font-medium">Meşru menfaat:</span> Güvenlik, suistimal önleme ve sistem iyileştirme.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">
                            <span className="text-primary">5)</span> Kişisel Verilerin Aktarılması
                        </h2>
                        <p>Hizmetin sunulması amacıyla verileriniz şu sağlayıcılara aktarılabilir:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <div className="p-3 bg-surface border border-border rounded-xl text-sm">Vercel (Barındırma)</div>
                            <div className="p-3 bg-surface border border-border rounded-xl text-sm">Google Firebase / Firestore</div>
                            <div className="p-3 bg-surface border border-border rounded-xl text-sm">Sentry (Performans/Hata)</div>
                            <div className="p-3 bg-surface border border-border rounded-xl text-sm">Yetkili Yasal Kurumlar</div>
                        </div>
                        <p className="mt-4 text-xs italic">Sunucular yurt dışında bulunabilir; aktarımlar KVKK hükümlerine uygun yapılır.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">
                            <span className="text-primary">6)</span> Çerezler ve Benzeri Teknolojiler
                        </h2>
                        <p>Zorunlu ve işlevsel çerezler kullanılmaktadır. Reklam/pazarlama amaçlı çerezler hedeflenmemektedir. Firebase ve Sentry gibi servisler teknik tanımlayıcılar kullanabilir.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">
                            <span className="text-primary">7)</span> Saklama Süreleri
                        </h2>
                        <p>Hesap verileriniz hesabınız aktif olduğu sürece saklanır. Silme talebi sonrası yasal zorunluluklar saklı kalmak üzere silinir veya anonim hale getirilir. Log kayıtları makul sürelerle (90-180 gün) saklanabilir.</p>
                    </section>

                    <section className="bg-primary/5 p-6 rounded-3xl border border-primary/20">
                        <h2 className="text-xl font-bold text-foreground mb-4">
                            <span className="text-primary">9)</span> Haklarınız ve Başvuru
                        </h2>
                        <p>KVKK m.11 uyarınca başvurularınızı <span className="text-primary font-bold">info@favduck.com</span> adresine iletebilirsiniz. Başvurularınız en geç 30 gün içinde sonuçlandırılır.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
