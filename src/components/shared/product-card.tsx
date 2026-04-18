"use client";

import { motion } from "framer-motion";
import { formatPrice, calculateSavings } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { ShoppingCart, TrendingDown, Star } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  selected?: boolean;
}

export function ProductCard({ product, onSelect, selected }: ProductCardProps) {
  const savings = calculateSavings(product.retail_price, product.wholesale_price);
  const savedAmount = product.retail_price - product.wholesale_price;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      onClick={() => onSelect?.(product)}
      className={`glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
        selected
          ? "ring-2 ring-primary shadow-lg shadow-primary/10"
          : "hover:shadow-xl hover:shadow-primary/5"
      }`}
    >
      <div className="h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-success/90 text-white text-xs font-bold rounded-full flex items-center gap-1">
          <TrendingDown className="w-3 h-3" />
          Save {savings}%
        </div>
        <div className="text-6xl opacity-40">🥤</div>
        {product.vendor && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-card/80 backdrop-blur-sm px-2 py-1 rounded-lg">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-medium text-foreground">
              {product.vendor.rating}
            </span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 bg-secondary rounded-md font-medium">
            {product.weight}
          </span>
          {product.vendor && (
            <span className="truncate">{product.vendor.name}</span>
          )}
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <span className="text-lg font-bold text-primary">
              {formatPrice(product.wholesale_price)}
            </span>
            <span className="text-xs text-muted-foreground line-through ml-2">
              {formatPrice(product.retail_price)}
            </span>
          </div>
          <div className="text-xs text-success font-medium">
            Save {formatPrice(savedAmount)}
          </div>
        </div>

        {onSelect && (
          <button
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {selected ? "Selected" : "Select"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
