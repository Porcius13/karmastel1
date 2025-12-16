import Navbar from "@/components/Navbar";
import ProductList from "@/components/ProductList";

export default function Dashboard() {
  return (
    <>
      <Navbar />

      <main className="main-content">
        <div className="welcome-section">
          <h1 className="welcome-title">MERHABA, DEMO!</h1>
          <p className="welcome-subtitle">FAVORİ ÜRÜNLERİNİZİ KEŞFEDİN</p>
        </div>

        <ProductList />
      </main>
    </>
  );
}
