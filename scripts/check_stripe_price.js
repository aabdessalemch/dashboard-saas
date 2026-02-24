const fs = require('fs');
(async()=>{
  try {
    const dotenv = fs.readFileSync('./.env.local', 'utf8');
    const m = {};
    dotenv.split('\n').forEach(l => {
      const i = l.indexOf('=');
      if (i > 0) {
        const k = l.slice(0, i).trim();
        const v = l.slice(i+1).trim();
        m[k] = v.replace(/^\"|\"$/g, '');
      }
    });
    if (!m.STRIPE_SECRET_KEY || !m.NEXT_PUBLIC_STRIPE_PRICE_ID) {
      console.error('Missing STRIPE_SECRET_KEY or NEXT_PUBLIC_STRIPE_PRICE_ID in .env.local');
      process.exit(1);
    }
    const Stripe = require('stripe');
    const stripe = Stripe(m.STRIPE_SECRET_KEY);
    const price = await stripe.prices.retrieve(m.NEXT_PUBLIC_STRIPE_PRICE_ID);
    console.log(JSON.stringify({
      id: price.id,
      unit_amount: price.unit_amount,
      unit_amount_decimal: price.unit_amount_decimal,
      currency: price.currency,
      recurring: price.recurring,
      active: price.active
    }, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
