# Business directory setup

The directory lets signed-in users publish business pages with a cover photo, logo, up to five gallery photos, a Gwalior address, contact details, opening hours, social links, and a description. Profiles include Posts, Photos, Reviews, and About sections. Owners can publish updates and reply to reviews; visitors can follow businesses, like and comment on updates, and leave one 1–5-star review per business (which they can later update). Business owners cannot review their own listing.

## Enable the feature in Supabase

1. Open the correct project in the Supabase Dashboard.
2. Open **SQL Editor** and run the current full [`schema.sql`](./schema.sql). This is required even if you previously ran an older version: the latest schema adds profile fields, business follows/posts/comments, owner review replies, rating breakdowns, and updated directory/review functions. It creates or updates the business tables, public photo bucket, access policies, and read functions. The schema is designed to be re-run safely.
3. Ensure the `business-photos` bucket was created by the script. It accepts JPG, PNG, and WebP files up to 5 MB each.
4. Reload the app. Signed-in users can choose **Businesses → List your business**. Public visitors can browse listings, updates, photos, and reviews; signing in is required to follow, like, comment, or post a review. Only the business owner can publish updates and respond to reviews.

New listings are public immediately after creation. They are not paid listings and do not expire. Owners should only list businesses they are authorized to represent. New listings cannot self-assign a verified badge; verification must be granted by an administrator. Sample profiles and their ratings are illustrative and are not real recommendations. Reviews are community-submitted and editable by their author.
