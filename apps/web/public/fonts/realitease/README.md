# Realitease Font Setup Instructions

To complete the font setup for the Realitease cover page, you need to copy the following font files from your design assets:

## Required Fonts:

1. **NYTKarnak_Condensed** (for the main "Realitease" title)
   - Copy to: `/public/fonts/realitease/NYTKarnak_Condensed.ttf`
   - Font weight: bold
   - Used for: Main title "Realitease"

2. **KarnakPro-Book** (for the subtitle)
   - Copy to: `/public/fonts/realitease/KarnakPro-Book.ttf`
   - Font weight: normal
   - Used for: "Get 8 chances to guess the Reality TV Star"

3. **NYTFranklin** (for the play button)
   - Copy to: `/public/fonts/realitease/NYTFranklin.ttf`
   - Font weight: medium
   - Used for: "Play" button text

4. **TN_Web_Use_Only** (for the date)
   - Copy to: `/public/fonts/realitease/TN_Web_Use_Only.ttf`
   - Font weight: bold
   - Used for: Date display

5. **Helvetica_Neue** (for general text)
   - Copy to: `/public/fonts/realitease/Helvetica_Neue.ttf`
   - Font weight: normal
   - Used for: "No. 0000" and "Edited by TRR"

## Copy Commands:

Run these commands from your terminal to copy the fonts:

```bash
# Create fonts directory if it doesn't exist
mkdir -p /Users/thomashulihan/Projects/TRR-APP/apps/web/public/fonts/realitease

# Copy fonts from your design assets (update paths as needed)
cp "/path/to/your/fonts/NYTKarnak_Condensed.ttf" "/Users/thomashulihan/Projects/TRR-APP/apps/web/public/fonts/realitease/"
cp "/path/to/your/fonts/KarnakPro-Book.ttf" "/Users/thomashulihan/Projects/TRR-APP/apps/web/public/fonts/realitease/"
cp "/path/to/your/fonts/NYTFranklin.ttf" "/Users/thomashulihan/Projects/TRR-APP/apps/web/public/fonts/realitease/"
cp "/path/to/your/fonts/TN_Web_Use_Only.ttf" "/Users/thomashulihan/Projects/TRR-APP/apps/web/public/fonts/realitease/"
cp "/path/to/your/fonts/Helvetica_Neue.ttf" "/Users/thomashulihan/Projects/TRR-APP/apps/web/public/fonts/realitease/"
```

The fonts are already configured in the CSS and will automatically load once the files are in place.
