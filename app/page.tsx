"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Mail, Phone, Globe } from "lucide-react";
import { getReviews, createReview, Review } from "@/lib/reviews";

export default function Home() {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    name: "",
    occupation: "",
    content: "",
    rating: 5
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load reviews from database on mount
  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setIsLoading(true);
    const data = await getReviews();
    setReviews(data);
    setIsLoading(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reviewData.name || !reviewData.content) {
      alert("Please fill in your name and review!");
      return;
    }

    setIsSubmitting(true);

    // Save to database
    const newReview = await createReview({
      name: reviewData.name,
      occupation: reviewData.occupation || "User",
      content: reviewData.content,
      rating: reviewData.rating
    });

    if (newReview) {
      // Add to local state
      setReviews([newReview, ...reviews]);
      
      // Reset form and close modal
      setReviewData({ name: "", occupation: "", content: "", rating: 5 });
      setShowReviewModal(false);
    } else {
      alert("Failed to submit review. Please try again.");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-900 via-blue-800 to-teal-600 relative">
      {/* Navigation */}
      <nav className="flex justify-end items-center px-16 py-8 text-gray-200">
        <div className="flex gap-12 text-sm">
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
          <Link href="/pricing" className="hover:text-white transition">
            Pricing
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-16 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16 items-center">
          {/* Left Content */}
          <div className="text-white">
            <h1 className="text-7xl font-light mb-8 leading-tight">
              Talk To Data
            </h1>
            <p className="text-xl text-gray-200 font-light leading-relaxed max-w-lg mb-8">
              Build, customize, and explore your data visually to understand trends and make better decisions faster.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-4 bg-white text-indigo-900 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg text-lg"
            >
              Create Dashboard
            </Link>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="relative -mr-20 lg:-mr-40">
            <Image
              src="/ldpag2.png"
              alt="Dashboard Preview"
              width={1400}
              height={1050}
              className="w-full h-auto rounded-xl shadow-2xl"
              priority
            />
          </div>
        </div>
      </div>
    
      {/* Reviews Section */}
      <div className="container mx-auto px-16 pb-16">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Review Box */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
            <h3 className="text-white text-2xl font-semibold mb-4">Love Talk To Data?</h3>
            <p className="text-gray-200 mb-6">Share your experience and help others discover the power of AI dashboards!</p>
            <button 
              onClick={() => setShowReviewModal(true)}
              className="px-6 py-3 bg-white text-indigo-900 rounded-full font-semibold hover:bg-gray-100 transition flex items-center gap-2"
            >
              <Star size={20} />
              Add Review
            </button>
          </div>

          {/* Latest Reviews Preview */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
            <h3 className="text-white text-xl font-semibold mb-4">What Users Say</h3>
            {isLoading ? (
              <p className="text-gray-300">Loading reviews...</p>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 2).map((review, index) => (
                  <div key={review.id || index} className="border-b border-white/10 pb-3">
                    <div className="flex gap-1 mb-2">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="text-yellow-400 fill-yellow-400" size={16} />
                      ))}
                    </div>
                    <p className="text-gray-200 text-sm mb-2">"{review.content.substring(0, 80)}..."</p>
                    <p className="text-white text-sm font-semibold">{review.name}</p>
                    <p className="text-gray-300 text-xs">{review.occupation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Reviews */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
          <h3 className="text-white text-2xl font-semibold mb-6">All Reviews ({reviews.length})</h3>
          
          {isLoading ? (
            <p className="text-gray-300 text-center py-8">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-gray-300 text-center py-8">No reviews yet. Be the first to share your experience!</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {reviews.map((review, index) => (
                <div key={review.id || index} className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="text-yellow-400 fill-yellow-400" size={18} />
                    ))}
                  </div>
                  <p className="text-gray-200 mb-4">"{review.content}"</p>
                  <div>
                    <p className="text-white font-semibold">{review.name}</p>
                    <p className="text-gray-300 text-sm">{review.occupation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-indigo-900 to-blue-900 border-2 border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6">Leave a Review</h3>
            
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={reviewData.name}
                  onChange={(e) => setReviewData({ ...reviewData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="Your name"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Occupation
                </label>
                <input
                  type="text"
                  value={reviewData.occupation}
                  onChange={(e) => setReviewData({ ...reviewData, occupation: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="Your role or occupation"
                  disabled={isSubmitting}
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Rating *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className="transition-transform hover:scale-110"
                      disabled={isSubmitting}
                    >
                      <Star
                        size={32}
                        className={
                          star <= reviewData.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-500"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Your Review *
                </label>
                <textarea
                  value={reviewData.content}
                  onChange={(e) => setReviewData({ ...reviewData, content: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/40 transition-all resize-none"
                  placeholder="Tell us about your experience..."
                  rows={4}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-white text-indigo-900 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Section */}
      <div className="border-t border-white/20 bg-black/20">
        <div className="container mx-auto px-8 py-20">
          <h2 className="text-4xl font-light text-white text-center mb-16">Get In Touch</h2>
          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl">
              {/* Website */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center mb-4 shadow-lg">
                  <Globe size={32} className="text-white" />
                </div>
                <h4 className="text-white text-lg font-semibold mb-2">Website</h4>
                <a
                  href="https://abdesslemch.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors text-base font-light"
                >
                  abdesslemch.com
                </a>
              </div>

              {/* Email */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center mb-4 shadow-lg">
                  <Mail size={32} className="text-white" />
                </div>
                <h4 className="text-white text-lg font-semibold mb-2">Email</h4>
                <a
                  href="mailto:aabdessalem.chaouch@gmail.com"
                  className="text-gray-300 hover:text-white transition-colors text-base font-light"
                >
                  aabdessalem.chaouch@gmail.com
                </a>
              </div>

              {/* Phone */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center mb-4 shadow-lg">
                  <Phone size={32} className="text-white" />
                </div>
                <h4 className="text-white text-lg font-semibold mb-2">Phone</h4>
                <a
                  href="tel:+14374511297"
                  className="text-gray-300 hover:text-white transition-colors text-base font-light"
                >
                  +1 (437)-451-1297
                </a>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mt-16 pt-8">
            <p className="text-gray-400 text-center text-sm">
              © 2026 Talk To Data. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}