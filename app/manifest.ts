import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sweet Dreams Gestão',
    short_name: 'Sweet Gestão',
    description: 'Pedidos, produção, custos, NFC-e e financeiro da Sweet Dreams.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f2e7',
    theme_color: '#f8f2e7',
    icons: [{ src: '/logo.png', sizes: 'any', type: 'image/png' }],
  };
}
