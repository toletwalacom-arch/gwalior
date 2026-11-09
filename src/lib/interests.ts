export const INTEREST_CATEGORIES = [
  { name: "Food & Dining", interests: ["Street Food", "Restaurants", "Cafes", "Fast Food", "Sweets & Desserts", "Food Blogging", "Tea & Coffee", "Local Food Spots"] },
  { name: "Travel & Places", interests: ["Gwalior Tourism", "Historical Places", "Fort & Heritage", "Nature & Parks", "Weekend Outings", "Photography Spots", "Travel", "Adventure"] },
  { name: "Education & Students", interests: ["College Life", "School Education", "Competitive Exams", "JEE & NEET", "Government Exams", "Study Groups", "Career Guidance", "Online Learning"] },
  { name: "Business & Entrepreneurship", interests: ["Entrepreneurship", "Startups", "Small Businesses", "Local Shopping", "Real Estate", "Marketing", "Networking", "Freelancing"] },
  { name: "Jobs & Career", interests: ["Government Jobs", "Private Jobs", "IT & Technology", "Work From Home", "Internships", "Career Development", "Skill Development", "Business Opportunities"] },
  { name: "Technology", interests: ["Technology", "Artificial Intelligence", "Web Development", "Programming", "Gadgets", "Gaming", "Digital Marketing", "Startups & Innovation"] },
  { name: "Sports & Fitness", interests: ["Cricket", "Football", "Badminton", "Gym & Fitness", "Yoga", "Running", "Cycling", "Sports Events"] },
  { name: "Entertainment & Lifestyle", interests: ["Movies", "Music", "Bollywood", "Web Series", "Gaming", "Fashion", "Shopping", "Nightlife"] },
  { name: "Arts & Creativity", interests: ["Photography", "Videography", "Content Creation", "Art & Design", "Dance", "Singing", "Writing", "Local Creators"] },
  { name: "Community & Social Causes", interests: ["Social Work", "Volunteering", "Environment", "Animal Welfare", "Community Events", "Local Development", "Helping Others", "Cultural Activities"] },
  { name: "Gwalior Life", interests: ["Gwalior Local News", "Gwalior Events", "Gwalior Food", "Gwalior Heritage", "Gwalior Markets", "Gwalior Businesses", "Gwalior Colleges", "Gwalior Startups", "Gwalior Street Food", "Gwalior Photography", "Gwalior Culture", "Gwalior Development", "Local Recommendations", "Gwalior Community"] },
] as const

export const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap((category) => category.interests)
