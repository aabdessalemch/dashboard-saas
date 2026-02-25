import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    // Find or create a Stripe customer by email.
    // Avoid forcing a custom customer id — create a proper customer and
    // (in production) persist the returned `customer.id` in your database.
    let customer: Stripe.Response<Stripe.Customer> | null = null;

    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data && existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
    }

    // Create checkout session
    const origin = req.headers.get('origin') || 'http://localhost:3001';
    // Allow overriding the site URL with an env var for production deployments
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
    const baseUrl = siteUrl;

    const session = await stripe.checkout.sessions.create({
      customer: customer!.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/dashboard?canceled=true`,
      metadata: {
        supabase_user_id: userId,
      },
    });

    return NextResponse.json({ sessionId: session.id, checkoutUrl: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}