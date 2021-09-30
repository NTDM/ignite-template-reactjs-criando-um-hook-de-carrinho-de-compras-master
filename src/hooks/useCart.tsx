import axios from 'axios';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const getQtdInStock = async (productId: number) => {
    const responseStock = await api.get<Stock>(`/stock/${productId}`);
    return responseStock.data.amount || 0;
  }

  const addProduct = async (productId: number) => {
    try {
      const inStock = await getQtdInStock(productId);
      const myCart = [...cart];
      const cartItemAlreadyExists = myCart.find(el => el.id === productId);
      const newQtd = (cartItemAlreadyExists ? cartItemAlreadyExists.amount : 0) + 1;

      if (inStock < newQtd) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (cartItemAlreadyExists) {
        cartItemAlreadyExists.amount = newQtd;
      } else {
        const responseProducts = await api.get<Product>(`/products/${productId}`);
        const newProduct = {
          ...responseProducts.data,
          amount: newQtd
        }
        myCart.push(newProduct);
      }
      setCart(myCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(myCart));
    } catch {
     toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const myCart = [...cart];
      const filteredCart = myCart.filter(el => el.id !== productId);
      if (filteredCart.length === myCart.length) {
        toast.error('Erro na remoção do produto');
        return;
      }
      setCart(filteredCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        toast.error('Quantidade inválida');
        return;
      }

      const inStock = await getQtdInStock(productId);
      if (amount > inStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } else {
        const myCart = [...cart];
        const cartItem = myCart.find(el => el.id === productId);
        if (cartItem) {
          cartItem.amount = amount;
          setCart(myCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(myCart));
        }
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
