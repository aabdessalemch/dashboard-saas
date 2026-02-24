import { supabase } from './supabase';

export interface Review {
  id?: string;
  name: string;
  occupation?: string;
  content: string;
  rating: number;
  created_at?: string;
}

export async function getReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }

  return data || [];
}

export async function createReview(review: Omit<Review, 'id' | 'created_at'>): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .insert([review])
    .select()
    .single();

  if (error) {
    console.error('Error creating review:', error);
    return null;
  }

  return data;
}