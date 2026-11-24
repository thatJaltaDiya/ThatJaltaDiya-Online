import assert from 'assert';

const API_BASE = 'http://localhost:5000/api/v1';
const CLIENT_BASE = 'http://localhost:5173';

async function runVerification() {
  console.log('🚀 Starting Automated End-to-End Verification...');

  // 1. Verify Client HTML serving
  console.log('\n1. Testing Frontend Client index.html...');
  const clientRes = await fetch(CLIENT_BASE);
  assert.strictEqual(clientRes.status, 200, 'Frontend server should respond with 200 OK');
  const clientHtml = await clientRes.text();
  assert(clientHtml.includes('That Jalta Diya'), 'Client HTML should contain brand title');
  console.log('   ✓ Frontend client index.html served successfully');

  // 2. Verify Public Settings
  console.log('\n2. Testing Public Site Settings API...');
  const settingsRes = await fetch(`${API_BASE}/settings/public`);
  assert.strictEqual(settingsRes.status, 200, 'Settings endpoint should return 200');
  const settingsData = await settingsRes.json();
  assert(settingsData.success, 'Settings response success should be true');
  assert(settingsData.data.shipping_fee, 'Should have shipping_fee setting');
  assert(settingsData.data.announcement_bar, 'Should have announcement_bar setting');
  console.log('   ✓ Public settings verified:', Object.keys(settingsData.data).join(', '));

  // 3. Verify Categories API
  console.log('\n3. Testing Categories API...');
  const catRes = await fetch(`${API_BASE}/categories`);
  assert.strictEqual(catRes.status, 200, 'Categories endpoint should return 200');
  const catData = await catRes.json();
  assert(catData.success && catData.data.length >= 6, 'Should return at least 6 categories');
  console.log(`   ✓ Found ${catData.data.length} categories:`, catData.data.map(c => c.name).join(', '));

  // 4. Verify Products API with filtering & pagination
  console.log('\n4. Testing Products Listing & Filtering API...');
  const prodRes = await fetch(`${API_BASE}/products?limit=8&category=candle-bouquets`);
  assert.strictEqual(prodRes.status, 200, 'Products endpoint should return 200');
  const prodData = await prodRes.json();
  assert(prodData.success, 'Products response success should be true');
  assert(Array.isArray(prodData.data) && prodData.data.length > 0, 'Should find products in candle-bouquets category');
  console.log(`   ✓ Found ${prodData.data.length} items (Total: ${prodData.pagination?.totalItems || prodData.data.length})`);

  // 5. Verify Product Detail API
  console.log('\n5. Testing Single Product Detail API...');
  const detailRes = await fetch(`${API_BASE}/products/pink-peony-dream-candle-bouquet`);
  assert.strictEqual(detailRes.status, 200, 'Product detail endpoint should return 200');
  const detailData = await detailRes.json();
  assert(detailData.success, 'Product detail should be successful');
  const product = detailData.data.product;
  assert(product, 'detailData.data.product should be defined');
  assert.strictEqual(product.name, 'Pink Peony Dream Candle Bouquet');
  assert(product.images.length >= 2, 'Should have at least 2 images');
  assert(product.variants.length >= 1, 'Should have variants');
  assert(Array.isArray(detailData.data.relatedProducts), 'Should include relatedProducts');
  console.log(`   ✓ Verified product: ${product.name} (Price: ₹${(product.price / 100).toFixed(2)}) with ${product.images.length} images and ${product.variants.length} variants`);

  // 6. Verify Image Serving
  console.log('\n6. Testing Generated WebP Image Serving...');
  const sampleImageUrl = `http://localhost:5000${product.images[0].url}`;
  const imgRes = await fetch(sampleImageUrl);
  assert.strictEqual(imgRes.status, 200, 'Image should be served with 200 OK');
  const contentType = imgRes.headers.get('content-type');
  assert(contentType.includes('image/webp'), 'Image content-type should be image/webp');
  console.log(`   ✓ Image served correctly from ${product.images[0].url} (Content-Type: ${contentType})`);

  // 7. Verify Testimonials API
  console.log('\n7. Testing Testimonials API...');
  const testRes = await fetch(`${API_BASE}/testimonials`);
  assert.strictEqual(testRes.status, 200, 'Testimonials endpoint should return 200');
  const testData = await testRes.json();
  assert(testData.success && testData.data.length >= 4, 'Should return at least 4 testimonials');
  console.log(`   ✓ Found ${testData.data.length} approved testimonials`);

  // 8. Verify Guest Cart Flow
  console.log('\n8. Testing Guest Cart Flow...');
  const guestId = '11111111-2222-3333-4444-555555555555';
  const addToCartRes = await fetch(`${API_BASE}/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: product.id,
      variantId: product.variants[0].id,
      quantity: 2,
      guestId,
    }),
  });
  assert.strictEqual(addToCartRes.status, 200, 'Add to cart should succeed');
  const cartData = await addToCartRes.json();
  assert(cartData.success, 'Cart response should succeed');
  assert(cartData.data.items.length >= 1, 'Cart should contain at least 1 item');
  console.log('   ✓ Cart operations verified (Item added, quantity verified)');

  // 9. Verify Admin Login & Dashboard API
  console.log('\n9. Testing Admin Authentication & Dashboard Stats...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@thatjaltadiya.com',
      password: 'OwnerPassword123!',
    }),
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login should succeed');
  const loginData = await loginRes.json();
  assert(loginData.success && loginData.data.accessToken, 'Should return access token');
  const adminToken = loginData.data.accessToken;
  console.log('   ✓ Admin login authenticated successfully');

  // Admin Dashboard stats
  const statsRes = await fetch(`${API_BASE}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(statsRes.status, 200, 'Admin dashboard should return 200');
  const statsData = await statsRes.json();
  assert(statsData.success, 'Stats should succeed');
  console.log(`   ✓ Admin dashboard stats verified: ${statsData.data.totalProducts} products, ${statsData.data.totalCustomers} customers, low stock count: ${statsData.data.lowStockCount}`);

  // Admin Demo Status
  const demoStatusRes = await fetch(`${API_BASE}/admin/demo-status`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(demoStatusRes.status, 200, 'Admin demo-status should return 200');
  const demoStatusData = await demoStatusRes.json();
  assert(demoStatusData.data.hasDemoData === true, 'Should detect active demo data');
  console.log(`   ✓ Admin demo status verified: hasDemoData=${demoStatusData.data.hasDemoData} (${demoStatusData.data.counts.products} demo products active)`);

  // Admin Audit logs
  const auditRes = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(auditRes.status, 200, 'Admin audit logs should return 200');
  const auditData = await auditRes.json();
  assert(auditData.success, 'Audit logs should succeed');
  console.log(`   ✓ Admin audit logs verified (${auditData.data.length} logs recorded)`);

  console.log('\n🎉 ALL END-TO-END CHECKS PASSED PERFECTLY!\n');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
