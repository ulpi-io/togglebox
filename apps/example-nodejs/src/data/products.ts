export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  reviews?: { rating: number; comment: string; author: string }[];
}

export const products: Product[] = [
  {
    id: "prod-001",
    name: "Wireless Headphones",
    description: "Premium noise-cancelling wireless headphones",
    price: 199.99,
    category: "Electronics",
    inStock: true,
    reviews: [
      { rating: 5, comment: "Amazing sound quality!", author: "AudioFan" },
      { rating: 4, comment: "Great battery life", author: "TechReviewer" },
    ],
  },
  {
    id: "prod-002",
    name: "Smart Watch",
    description: "Fitness tracking smartwatch with heart rate monitor",
    price: 299.99,
    category: "Electronics",
    inStock: true,
    reviews: [
      { rating: 5, comment: "Perfect for workouts", author: "FitnessPro" },
    ],
  },
  {
    id: "prod-003",
    name: "Coffee Maker",
    description: "Programmable 12-cup coffee maker",
    price: 79.99,
    category: "Kitchen",
    inStock: false,
    reviews: [
      { rating: 4, comment: "Makes great coffee", author: "CoffeeLover" },
      { rating: 3, comment: "A bit noisy", author: "EarlyRiser" },
    ],
  },
];
