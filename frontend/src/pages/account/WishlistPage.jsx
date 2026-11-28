import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { useCart } from '../../context/CartContext.jsx';

export function WishlistPage() {
  const { wishlistItems, toggleWishlist } = useWishlist();
  const { addToCart, isAddingToCart } = useCart();

  if (wishlistItems.length === 0) {
    return (
      <Card className="p-12 text-center bg-white space-y-4">
        <Heart className="w-12 h-12 text-accent/40 mx-auto" />
        <h3 className="font-editorial text-2xl font-bold text-primary">Your Wishlist is Empty</h3>
        <p className="text-xs text-primary/70 max-w-sm mx-auto">
          Save your favorite candle bouquets and aesthetic gift hampers to review later.
        </p>
        <Link to="/shop">
          <Button variant="accent">Explore Drop</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-editorial text-2xl font-bold text-primary">
          Saved Favorites ({wishlistItems.length})
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {wishlistItems.map(item => {
          const product = item.product;
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-3 border border-border/20 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
            >
              <div>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-surface/40 mb-3">
                  <img
                    src={product.image || "/uploads/placeholder.webp"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 text-accent shadow-sm hover:scale-110 active:scale-95 flex items-center justify-center transition-all border border-border/10"
                    aria-label="Remove from favorites"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Link to={`/product/${product.slug}`} className="block">
                  <h4 className="font-sans text-sm font-bold text-primary hover:text-accent transition-colors truncate">
                    {product.name}
                  </h4>
                </Link>
                <div className="text-sm font-extrabold text-primary mt-1">
                  ₹{(product.price / 100).toFixed(0)}
                </div>
              </div>

              {(() => {
                const isAdding = isAddingToCart(product.id, null);
                return (
                  <button
                    type="button"
                    onClick={() => addToCart(product.id, null, 1)}
                    disabled={product.stock <= 0 || isAdding}
                    aria-busy={isAdding}
                    className="inline-flex items-center justify-center gap-1.5 w-full mt-3 py-2 rounded-full text-xs font-bold bg-primary text-white hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isAdding ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShoppingBag className="w-3.5 h-3.5" />
                    )}
                    <span>{isAdding ? 'Adding...' : 'Move To Bag'}</span>
                  </button>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
