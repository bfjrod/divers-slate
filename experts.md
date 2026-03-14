DiveSpot: Technical & Functional Feature Specifications

This document outlines the core architecture and user-facing features of the DiveSpot application, a social ecosystem designed for the global scuba diving community.

1. Authentication & User Onboarding

DiveSpot uses a robust authentication layer powered by Supabase/PostgreSQL to ensure user data security and seamless cross-device syncing.

Multi-Channel Login:

Email/Password: Standard secure entry with Bcrypt hashing.

Social OAuth: One-tap integration with Google and Apple ID.

User Profiles:

Diver Tier: Personal logbooks, certification badges (PADI, SSI, NAUI), and "Best Depth" statistics.

Professional Tier: Verified profiles for Dive Masters and Instructors linked to specific Dive Shops.

Dive Shop Tier: Business profiles with service listings, staff management, and promotional gear slots.

2. Global Search & Site Discovery

The search engine is built for "Dive Context," moving beyond simple name matches to functional underwater parameters.

Search Parameters:

Name & Aliases: Search by official site name (e.g., "The Blue Hole") or local nicknames.

Geo-Location: Proximity-based search using the mobile device’s GPS.

Depth Filtering: Filter by Max Depth or Average Depth (e.g., "Show me sites under 30m").

Difficulty Tags: Beginner, Intermediate, and Advanced/Technical levels.

Site Metadata: Each search result displays a summary card featuring visibility ratings, current intensity, and a "Top Flora" preview.

3. Social Integration & Shared Experiences

Functioning as the "Untappd of Diving," the social layer connects local dives with a global community.

The Dive Feed:

Friends vs. Nearby: Toggle between a feed of people you follow and a feed of dives happening in your current geographic region.

Social Interactions: Like, comment, and "Save Site" functionality.

Sharing Mechanic:

Users can share dive sites or specific logs to external platforms (Instagram Stories, WhatsApp) via dynamic deep links.

Collaborative Map: Users can propose edits to site descriptions or add missing "Site Aliases" to keep the global database current.

4. The Check-in System (Digital Logbook)

The check-in screen is designed for post-dive data entry, prioritizing ease of use while the diver is still at the site.

Logging Parameters:

Star Rating: 1–5 star overall experience rating.

Conditions Log: Entry for Visibility (m/ft), Bottom Temperature, and Drift Current intensity.

Verification: Option to have the log digitally "signed" or verified by a Dive Shop or Instructor profile via QR code.

Flora & Fauna Tagging:

A dedicated section to tag marine life spotted during the dive.

Predictive Tagging: Suggests common species based on the site's historical data (e.g., if at "Shark Reef," Grey Reef Shark appears as a top suggestion).

Community Contribution: If a user tags a rare species, it updates the "Commonly Seen" list for that site profile.

5. Dive Computer & Profile Integration

A standout feature allowing the transition from raw sensor data to visual social content.

File Format Support:

Support for .fit (Garmin), .sde (Suunto), and .uddf (Universal) file formats.

Brand Integrations:

Garmin Connect API: Direct sync for Descent series users.

Shearwater Cloud: Import via Bluetooth or exported file logs.

Suunto App: Direct API handshake to fetch recent dive activities.

Data Visualization:

Dynamic Depth Graph: A high-fidelity line chart showing the ascent/descent profile.

Overlay Metrics: Water temperature fluctuations and NDL (No Decompression Limit) warnings displayed over the time-depth axis.

6. Dive Shop & Gear Marketplace

The business layer connects divers with local services and relevant equipment.

Shop Profiles:

Display "Instructor Rosters" with clickable profiles.

"Check-in at Shop" feature to rate rentals, boat quality, and staff expertise.

Gear Advertising:

Contextual Ads: Gear manufacturers can target ads based on user behavior (e.g., showing drysuit ads to divers frequently logging in water below 15°C).

Gear Tags: Users can tag the gear they used (e.g., "Logged with Shearwater Perdix") to show reliability and community preference.

7. Technical Requirements

Frontend: React Native (iOS/Android) for a native "vibe coding" feel.

Backend: Supabase for Realtime Database and Auth.

Map Engine: Mapbox for custom oceanic bathymetry styling.

Storage: Supabase Storage for high-resolution underwater photography.