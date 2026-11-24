import { Package, Trash } from "lucide-react";
import { createNodeFeature, ToolbarButton, ToolbarSeparator } from "cheese-editor";

/**
 * Example custom component: a product card stored in the document as
 * <div data-type="product-card" data-product-id="..." data-layout="..."></div>.
 */
const PRODUCTS: Record<string, { name: string; price: string; image: string }> = {
  "sp-001": {
    name: "Áo thun basic",
    price: "199.000₫",
    image: "https://picsum.photos/seed/shirt/240/240",
  },
  "sp-002": {
    name: "Quần jean slim",
    price: "549.000₫",
    image: "https://picsum.photos/seed/jeans/240/240",
  },
  "sp-003": {
    name: "Giày sneaker",
    price: "1.290.000₫",
    image: "https://picsum.photos/seed/shoes/240/240",
  },
};

export const productCard = createNodeFeature({
  name: "productCard",
  attrs: { productId: "sp-001", layout: "horizontal" as "horizontal" | "vertical" },
  component: ({ attrs, selected }) => {
    const product = PRODUCTS[attrs.productId];
    if (!product)
      return <div className="product-card">Không tìm thấy sản phẩm {attrs.productId}</div>;
    return (
      <div className={`product-card product-card-${attrs.layout} ${selected ? "is-selected" : ""}`}>
        <img src={product.image} alt={product.name} />
        <div>
          <strong>{product.name}</strong>
          <div className="product-card-price">{product.price}</div>
          <button type="button">Mua ngay</button>
        </div>
      </div>
    );
  },
  toolbar: { icon: Package, title: "Product card" },
  slash: {
    title: "Sản phẩm",
    description: "Chèn thẻ sản phẩm",
    icon: Package,
    keywords: ["product", "san pham", "sp"],
  },
  bubble: ({ attrs, updateAttrs, deleteNode }) => (
    <>
      <select
        className="ce-input"
        value={attrs.productId}
        onChange={(event) => updateAttrs({ productId: event.target.value })}
      >
        {Object.entries(PRODUCTS).map(([id, product]) => (
          <option key={id} value={id}>
            {product.name}
          </option>
        ))}
      </select>
      <ToolbarButton
        title="Toggle layout"
        onClick={() =>
          updateAttrs({ layout: attrs.layout === "horizontal" ? "vertical" : "horizontal" })
        }
      >
        {attrs.layout === "horizontal" ? "Ngang" : "Dọc"}
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton icon={Trash} title="Delete" onClick={deleteNode} />
    </>
  ),
});
