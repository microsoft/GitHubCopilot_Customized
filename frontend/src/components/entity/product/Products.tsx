import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from 'react-query';
import { api } from '../../../api/config';
import { useTheme } from '../../../context/ThemeContext';

interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  imgName: string;
  sku: string;
  unit: string;
  supplierId: number;
  discount?: number;
}

type ProductSort = 'name-asc' | 'price-asc' | 'price-desc';

const discoveryParams = ['search', 'minPrice', 'maxPrice', 'discounted', 'sort'];

const effectivePrice = (product: Product) => product.price * (1 - (product.discount ?? 0));

const parsePrice = (value: string | null) => {
  if (value === null || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isProductSort = (value: string | null): value is ProductSort =>
  value === 'name-asc' || value === 'price-asc' || value === 'price-desc';

const fetchProducts = async (): Promise<Product[]> => {
  const { data } = await axios.get(`${api.baseURL}${api.endpoints.products}`);
  return data;
};

export default function Products() {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') ?? '';
  const minPriceValue = searchParams.get('minPrice') ?? '';
  const maxPriceValue = searchParams.get('maxPrice') ?? '';
  const minPrice = parsePrice(searchParams.get('minPrice'));
  const maxPrice = parsePrice(searchParams.get('maxPrice'));
  const discountedOnly = searchParams.get('discounted') === 'true';
  const sortValue = searchParams.get('sort');
  const sort = isProductSort(sortValue) ? sortValue : '';
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { data: products, isLoading, error } = useQuery('products', fetchProducts);
  const { darkMode } = useTheme();

  const priceValidationMessage =
    (minPrice !== undefined && minPrice < 0) || (maxPrice !== undefined && maxPrice < 0)
      ? 'Prices cannot be negative.'
      : minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice
        ? 'Minimum price cannot be greater than maximum price.'
        : '';

  const updateSearchParam = (key: string, value: string, replace = false) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace });
  };

  const resetDiscovery = () => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      discoveryParams.forEach(param => next.delete(param));
      return next;
    });
  };

  const filteredProducts = (products ?? []).filter(product => {
    const normalizedSearch = searchTerm.toLocaleLowerCase();
    const matchesSearch = product.name.toLocaleLowerCase().includes(normalizedSearch) ||
      product.description.toLocaleLowerCase().includes(normalizedSearch) ||
      product.sku.toLocaleLowerCase().includes(normalizedSearch);
    const isDiscounted = (product.discount ?? 0) > 0;
    const price = effectivePrice(product);
    const matchesPrice = Boolean(priceValidationMessage) ||
      ((minPrice === undefined || price >= minPrice) && (maxPrice === undefined || price <= maxPrice));

    return matchesSearch && (!discountedOnly || isDiscounted) && matchesPrice;
  });

  const visibleProducts = [...filteredProducts];
  if (sort === 'name-asc') {
    visibleProducts.sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
  } else if (sort === 'price-asc') {
    visibleProducts.sort((first, second) => effectivePrice(first) - effectivePrice(second));
  } else if (sort === 'price-desc') {
    visibleProducts.sort((first, second) => effectivePrice(second) - effectivePrice(first));
  }

  const handleQuantityChange = (productId: number, change: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + change)
    }));
  };

  const handleAddToCart = (productId: number) => {
    const quantity = quantities[productId] || 0;
    if (quantity > 0) {
      // TODO: Implement cart functionality
      alert(`Added ${quantity} items to cart`);
      setQuantities(prev => ({
        ...prev,
        [productId]: 0
      }));
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-red-500 text-center">Failed to fetch products</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-6">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} transition-colors duration-300`}>Products</h1>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => updateSearchParam('search', e.target.value, true)}
              className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-800 text-light border-gray-700' : 'bg-white text-gray-800 border-gray-300'} rounded-lg border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors duration-300`}
              aria-label="Search products"
            />
            <svg 
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="minimum-price" className={`block mb-1 ${darkMode ? 'text-light' : 'text-gray-700'}`}>Minimum price</label>
              <input
                id="minimum-price"
                type="number"
                min="0"
                step="0.01"
                value={minPriceValue}
                onChange={event => updateSearchParam('minPrice', event.target.value, true)}
                aria-invalid={Boolean(priceValidationMessage)}
                aria-describedby={priceValidationMessage ? 'price-validation' : undefined}
                className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800 text-light border-gray-700' : 'bg-white text-gray-800 border-gray-300'} rounded-lg border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none`}
              />
            </div>
            <div>
              <label htmlFor="maximum-price" className={`block mb-1 ${darkMode ? 'text-light' : 'text-gray-700'}`}>Maximum price</label>
              <input
                id="maximum-price"
                type="number"
                min="0"
                step="0.01"
                value={maxPriceValue}
                onChange={event => updateSearchParam('maxPrice', event.target.value, true)}
                aria-invalid={Boolean(priceValidationMessage)}
                aria-describedby={priceValidationMessage ? 'price-validation' : undefined}
                className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800 text-light border-gray-700' : 'bg-white text-gray-800 border-gray-300'} rounded-lg border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none`}
              />
            </div>
            <label className={`flex items-center gap-2 ${darkMode ? 'text-light' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={discountedOnly}
                onChange={event => updateSearchParam('discounted', event.target.checked ? 'true' : '')}
                className="h-4 w-4 accent-primary"
              />
              Discounted only
            </label>
            <div>
              <label htmlFor="product-sort" className={`block mb-1 ${darkMode ? 'text-light' : 'text-gray-700'}`}>Sort by</label>
              <select
                id="product-sort"
                value={sort}
                onChange={event => updateSearchParam('sort', event.target.value)}
                className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800 text-light border-gray-700' : 'bg-white text-gray-800 border-gray-300'} rounded-lg border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none`}
              >
                <option value="">Default order</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </div>
          </div>

          {priceValidationMessage && (
            <p id="price-validation" role="alert" className="text-red-500">
              {priceValidationMessage}
            </p>
          )}

          <div className="flex items-center justify-between gap-4">
            <p aria-live="polite" aria-atomic="true" className={`${darkMode ? 'text-light' : 'text-gray-700'}`}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
            </p>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-10">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>No products found</h2>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>Try adjusting your search or filters.</p>
              <button
                type="button"
                onClick={resetDiscovery}
                className="mt-4 px-4 py-2 rounded-lg bg-primary hover:bg-accent text-white transition-colors"
              >
                Reset filters
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleProducts.map(product => (
              <div key={product.productId} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(118,184,82,0.3)] flex flex-col`}>
                <div 
                  className={`relative h-56 ${darkMode ? 'bg-gradient-to-t from-gray-700 to-gray-800' : 'bg-gradient-to-t from-gray-100 to-white'} transition-colors duration-300 cursor-pointer`}
                  onClick={() => handleProductClick(product)}
                >
                  <img 
                    src={`/${product.imgName}`} 
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                  />
                  {(product.discount ?? 0) > 0 && (
                    <div className="absolute top-8 left-0 bg-primary text-white px-3 py-1 -rotate-90 transform -translate-x-5 shadow-md">
                      {Math.round((product.discount ?? 0) * 100)}% OFF
                    </div>
                  )}
                </div>
                
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className={`text-xl font-semibold ${darkMode ? 'text-light' : 'text-gray-800'} mb-2 transition-colors duration-300`}>{product.name}</h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4 flex-grow transition-colors duration-300`}>{product.description}</p>
                  <div className="space-y-4 mt-auto">
                    <div className="flex justify-between items-center">
                      {(product.discount ?? 0) > 0 ? (
                        <div>
                          <span className="text-gray-500 line-through text-sm mr-2">${product.price.toFixed(2)}</span>
                          <span className="text-primary text-xl font-bold">${(product.price * (1 - (product.discount ?? 0))).toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-primary text-xl font-bold">${product.price.toFixed(2)}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center space-x-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg p-1 transition-colors duration-300`}>
                        <button 
                          onClick={() => handleQuantityChange(product.productId, -1)}
                          className={`w-8 h-8 flex items-center justify-center ${darkMode ? 'text-light' : 'text-gray-700'} hover:text-primary transition-colors duration-300`}
                          aria-label={`Decrease quantity of ${product.name}`}
                          id={`decrease-qty-${product.productId}`}
                        >
                          <span aria-hidden="true">-</span>
                        </button>
                        <span 
                          className={`${darkMode ? 'text-light' : 'text-gray-800'} min-w-[2rem] text-center transition-colors duration-300`}
                          aria-label={`Quantity of ${product.name}`}
                          id={`qty-${product.productId}`}
                        >
                          {quantities[product.productId] || 0}
                        </span>
                        <button 
                          onClick={() => handleQuantityChange(product.productId, 1)}
                          className={`w-8 h-8 flex items-center justify-center ${darkMode ? 'text-light' : 'text-gray-700'} hover:text-primary transition-colors duration-300`}
                          aria-label={`Increase quantity of ${product.name}`}
                          id={`increase-qty-${product.productId}`}
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      </div>
                      <button 
                        onClick={() => handleAddToCart(product.productId)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          quantities[product.productId] 
                            ? 'bg-primary hover:bg-accent text-white' 
                            : `${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'} cursor-not-allowed`
                        }`}
                        disabled={!quantities[product.productId]}
                        aria-label={`Add ${quantities[product.productId] || 0} ${product.name} to cart`}
                        id={`add-to-cart-${product.productId}`}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div 
            className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transition-colors duration-300`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'} transition-colors duration-300`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={`${darkMode ? 'bg-gradient-to-t from-gray-700 to-gray-800' : 'bg-gradient-to-t from-gray-100 to-white'} rounded-lg mb-6 p-4`}>
              <img 
                src={`/${selectedProduct.imgName}`} 
                alt={selectedProduct.name}
                className="w-full h-auto object-contain max-h-[400px]"
              />
            </div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} mb-4 transition-colors duration-300`}>
              {selectedProduct.name}
            </h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-lg transition-colors duration-300`}>
              {selectedProduct.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}