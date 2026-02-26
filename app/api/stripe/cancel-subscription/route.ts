import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get Supabase client
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseServiceKey);

    // Get user's subscription from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Cancel subscription at period end (user keeps access until their paid period ends)
    const canceledSubscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    // Update user's subscription status in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancel_at_period_end',
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile after cancellation:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
    }

    console.log('✅ Subscription scheduled for cancellation at period end for user:', userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription will be canceled at the end of your billing period. You will keep access to Pro features until then.',
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      cancelAt: canceledSubscription.cancel_at
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
