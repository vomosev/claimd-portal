Changelog - Public Mantlepiece & Display Name Features + Spotify Integration
Version 1.0.1 - September 2025

Added

Spotify Links Integration

- **Award-Spotify Linking**: Connect up to 5 Spotify artists/tracks per Geo Drop
- **Database Junction Table**: `award_spotify_links` table with foreign key constraints
- **Navigation Preservation**: Form state maintained during Spotify search workflow
- **Link Management Interface**: View, add, and remove Spotify links from award forms
- **Real-time Link Counter**: Accurate "X/5 Links" display with max limit enforcement

Spotify Content Display

- **AwardDetailsPage Integration**: Spotify links section with official branding
- **Interactive Link Cards**: Artist/track thumbnails, type badges, direct Spotify buttons
- **Fallback Handling**: Default images for missing Spotify artwork
- **Empty State Management**: Clean messaging when no Spotify content linked

Backend API Endpoints

- `GET /award-spotify-links/{awardId}` - Fetch linked Spotify content for award
- `DELETE /award-spotify-links/{awardId}/{spotifyId}` - Remove specific Spotify link
- `POST /spotify-add` (enhanced) - Create award associations when `award_id` provided
- `GET /create-award-spotify-links-table` - Database table creation utility

Public Mantlepiece Feature

- **PublicMantlePiecePage Component**: New React component for viewing public mantlepieces without authentication
- **Dynamic Route**: `/[displayName]` route for personalized URLs (e.g., `geo-drops.com/joebloggs`)
- **All Public Mantlepiece**: `/mantlepiece` route showing community-wide public awards
- **Public Awards Filter**: Only displays awards marked as `public = 1` in database

Display Name Management

- **Settings Integration**: Added display name field to existing Settings page
- **Real-time Validation**: Live availability checking with visual indicators (✓/✗/spinner)
- **Handle Format Validation**: Enforces 3-30 characters, alphanumeric + underscores only
- **Separate Save Functionality**: Independent save button for display name updates

Backend API Endpoints

- `GET /users/{username}/display-name` - Retrieve current display name
- `GET /users/check-display-name/{handle}` - Check handle availability
- `PUT /users/{username}/display-name` - Update user's display name
- `GET /claimedawardsarray/public` - Get all public awards from all users
- `GET /claimedawardsarray/public/{displayName}` - Get specific user's public awards

Technical Changes

Database

- **Spotify Links Table**: `award_spotify_links` with BIGINT award_id matching awards.awardid
- **Foreign Key Constraints**: Proper referential integrity with CASCADE delete
- **Unique Constraints**: Prevents duplicate award-Spotify associations
- **Optimized Indexes**: Performance indexes on award_id, spotify_id, link_type
- Uses existing `displayname` column in `logins` table
- Added UNIQUE constraint support for display names
- Used queries to filter by `awards.public` instead of `claimedawards.public`

Frontend

- **SpotifySearch Enhancement**: Context-aware linking with existing links display
- **Award Form Integration**: Spotify section with launch/return navigation
- **Loading States**: Spinner animations for search and link operations
- **State Management**: Real-time link count tracking and UI updates
- **Component Structure**: Reusable PublicMantlePiecePage with displayName prop
- **API Integration**: Axios calls with proper error handling
- **TypeScript**: Proper typing for Next.js 15+ async params

Backend

- **Enhanced Spotify Routes**: Award linking logic in existing spotify-add endpoint
- **Link Management**: CRUD operations for award-Spotify associations
- **Error Handling**: Comprehensive validation and JSON response consistency
- **Route File**: New `routes/displayname.js` for all display name functionality
- **SQL Optimization**: Efficient queries with proper JOINs and filtering

Fixed

Spotify Integration Issues

- **Data Type Mismatch**: Changed award_id from INT to BIGINT to match awards.awardid
- **Foreign Key Errors**: Resolved constraint failures with proper column matching
- **Link Count Tracking**: Fixed incorrect "5/5 Links" display for fewer additions
- **State Preservation**: Form data maintained during navigation to/from Spotify search

Database Query Issues

- Corrected WHERE clause to use `a.public = 1` (awards table) instead of `ca.public = 1`
- Fixed column name references from `display_name` to `displayname`
- Resolved empty result sets for public mantlepiece queries

Next.js 15+ Compatibility

- Updated dynamic route params to handle Promise-based params
- Changed `params: { displayName: string }` to `params: Promise<{ displayName: string }>`
- Made page components async to await params

Type Safety

- Fixed TypeScript compilation errors for dynamic routes
- Added proper interfaces for all components and API responses
- Ensured compatibility with Next.js build process

Security

Input Validation

- **Spotify ID Validation**: Server-side validation of Spotify track/artist IDs
- **Link Limit Enforcement**: Application-level 5-link maximum per award
- **SQL Injection Prevention**: Parameterized queries for all Spotify operations
- Regex validation for handle format (`/^[a-zA-Z0-9_]{3,30}$/`)
- Conflict checking to prevent duplicate display names

Access Control

- **Award Association Security**: Links only created for valid award ownership
- **Delete Authorization**: Proper validation before link removal
- Public mantlepieces only show awards marked as public
- No authentication bypass for private data
- Proper error responses without data leakage

Summary

This release introduces comprehensive Spotify integration allowing users to enhance their Geo Drops with up to 5 linked artists or tracks, complete with management interface and display components. The public mantlepiece system enables achievement sharing via personalized URLs, with integrated display name management through the existing settings interface.
