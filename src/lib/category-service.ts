
export class CategoryService {
    private static readonly CATEGORIES = {
        'Gömlek': ['gömlek', 'shirt', 'bluz', 'tunik'],
        'T-Shirt': ['t-shirt', 'tişört', 'tshirt', 'top', 'atlet'],
        'Pantolon': ['pantolon', 'pants', 'trousers', 'jean', 'denim', 'tayt'],
        'Ceket/Mont': ['ceket', 'mont', 'kaban', 'trençkot', 'jacket', 'coat', 'yelek', 'blazer'],
        'Kazak/Hırka': ['kazak', 'hırka', 'süveter', 'triko', 'sweater', 'cardigan'],
        'Elbise/Etek': ['elbise', 'etek', 'dress', 'skirt', 'jumpsuit', 'tulum'],
        'Ayakkabı': ['ayakkabı', 'bot', 'çizme', 'terlik', 'sandalet', 'sneaker', 'babet', 'shoes', 'boots'],
        'Çanta': ['çanta', 'bag', 'cüzdan', 'wallet', 'backpack', 'valiz'],
        'Aksesuar': ['şapka', 'bere', 'atkı', 'eldiven', 'kemer', 'takı', 'kolye', 'küpe', 'gözlük', 'saat'],
        'Ev/Yaşam': ['nevresim', 'yastık', 'yorgan', 'battaniye', 'havlu', 'dekorasyon', 'mumluk', 'tablo']
    };

    /**
     * Predicts the category of a product based on its title.
     * Returns "Diğer" if no match is found.
     */
    static predictCategory(title: string): string {
        if (!title) return 'Diğer';

        const lowerTitle = title.toLowerCase();

        for (const [category, keywords] of Object.entries(this.CATEGORIES)) {
            if (keywords.some(keyword => lowerTitle.includes(keyword))) {
                return category;
            }
        }

        return 'Diğer';
    }
}
