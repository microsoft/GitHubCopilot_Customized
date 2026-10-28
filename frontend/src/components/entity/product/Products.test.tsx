import { QueryClient, QueryClientProvider } from 'react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { ThemeProvider } from '../../../context/ThemeContext';
import Products from './Products';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

const products = [
  {
    productId: 1,
    name: 'Green Beans',
    description: 'Fresh beans',
    price: 10,
    imgName: 'beans.jpg',
    sku: 'VEG-01',
    unit: 'kg',
    supplierId: 1,
    discount: 0.2,
  },
  {
    productId: 2,
    name: 'Coffee',
    description: 'Roasted coffee',
    price: 8,
    imgName: 'coffee.jpg',
    sku: 'COF-02',
    unit: 'bag',
    supplierId: 1,
    discount: 0.5,
  },
  {
    productId: 3,
    name: 'Tea',
    description: 'Loose leaf tea',
    price: 4,
    imgName: 'tea.jpg',
    sku: 'TEA-03',
    unit: 'box',
    supplierId: 1,
  },
];

function CurrentLocation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output aria-label="Current location">{location.pathname}{location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>Go back</button>
      <button type="button" onClick={() => navigate(1)}>Go forward</button>
    </>
  );
}

function renderProducts(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Products />
          <CurrentLocation />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('Products discovery', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: products } as never);
  });

  it('restores search from the URL and matches SKU case-insensitively', async () => {
    renderProducts('/products?search=tea-03&keep=1');

    expect(await screen.findByRole('heading', { name: 'Tea' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Coffee' })).toBeNull();
    expect((screen.getByRole('textbox', { name: 'Search products' }) as HTMLInputElement).value).toBe('tea-03');
    expect(screen.getByLabelText('Current location').textContent).toContain('keep=1');
  });

  it('combines case-insensitive search, discounted-only, and inclusive effective-price bounds', async () => {
    renderProducts('/products?search=COF&minPrice=4&maxPrice=4&discounted=true&keep=1');

    expect(await screen.findByRole('heading', { name: 'Coffee' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Green Beans' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Tea' })).toBeNull();
    expect(screen.getByText('1 product found')).toBeTruthy();
  });

  it('matches descriptions case-insensitively', async () => {
    const user = userEvent.setup();
    renderProducts('/products?keep=1');

    await user.type(await screen.findByRole('textbox', { name: 'Search products' }), 'FRESH');

    expect(screen.getByRole('heading', { name: 'Green Beans' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Coffee' })).toBeNull();
    expect(screen.getByLabelText('Current location').textContent).toContain('keep=');
  });

  it('includes products on both effective-price boundaries', async () => {
    renderProducts('/products?minPrice=4&maxPrice=4');

    expect(await screen.findByRole('heading', { name: 'Coffee' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tea' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Green Beans' })).toBeNull();
    expect(screen.getByText('2 products found')).toBeTruthy();
  });

  it('sorts by effective price and preserves source order for ties', async () => {
    const user = userEvent.setup();
    renderProducts('/products?sort=price-asc');

    await screen.findByRole('heading', { name: 'Green Beans' });
    const getProductOrder = () => screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);
    expect(getProductOrder()).toEqual(['Coffee', 'Tea', 'Green Beans']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price-desc');
    expect(getProductOrder()).toEqual(['Green Beans', 'Coffee', 'Tea']);
  });

  it('sorts by name and retains fetched order when sort is unset', async () => {
    const user = userEvent.setup();
    renderProducts('/products');

    await screen.findByRole('heading', { name: 'Tea' });
    const getProductOrder = () => screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);
    expect(getProductOrder()).toEqual(['Green Beans', 'Coffee', 'Tea']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'name-asc');
    expect(getProductOrder()).toEqual(['Coffee', 'Green Beans', 'Tea']);
  });

  it('shows an accessible validation message for negative prices without applying the invalid bound', async () => {
    renderProducts('/products?minPrice=-1');

    expect((await screen.findByRole('alert')).textContent).toContain('Prices cannot be negative.');
    expect(screen.getByLabelText('Minimum price').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('shows an accessible validation message when minimum price exceeds maximum', async () => {
    renderProducts('/products?minPrice=10&maxPrice=5');

    expect((await screen.findByRole('alert')).textContent).toContain('Minimum price cannot be greater than maximum price.');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('ignores malformed numeric and sort parameters without crashing', async () => {
    renderProducts('/products?minPrice=not-a-number&maxPrice=Infinity&sort=unknown&keep=1');

    expect(await screen.findByRole('heading', { name: 'Green Beans' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByRole('combobox', { name: 'Sort by' }) as HTMLSelectElement).value).toBe('');
    expect(screen.getByLabelText('Current location').textContent).toContain('keep=1');
  });

  it('resets discovery parameters while preserving unrelated query parameters', async () => {
    const user = userEvent.setup();
    renderProducts('/products?search=not-found&sort=price-asc&keep=1');

    await screen.findByRole('heading', { name: 'No products found' });
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    const currentUrl = screen.getByLabelText('Current location').textContent ?? '';
    expect(currentUrl).toContain('keep=1');
    expect(currentUrl).not.toContain('search=');
    expect(currentUrl).not.toContain('sort=');
  });

  it('restores discrete filter and sort changes with back and forward navigation', async () => {
    const user = userEvent.setup();
    renderProducts('/products?keep=1');

    await screen.findByRole('heading', { name: 'Green Beans' });
    await user.click(screen.getByRole('checkbox', { name: 'Discounted only' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price-desc');
    expect(screen.getByLabelText('Current location').textContent).toContain('sort=price-desc');

    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect((screen.getByRole('combobox', { name: 'Sort by' }) as HTMLSelectElement).value).toBe('');
    expect((screen.getByRole('checkbox', { name: 'Discounted only' }) as HTMLInputElement).checked).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Go forward' }));
    expect((screen.getByRole('combobox', { name: 'Sort by' }) as HTMLSelectElement).value).toBe('price-desc');
  });
});