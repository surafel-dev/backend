// config/passport.google.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const studentService = require('../modules/student/student.service'); // adjust path to match your project structure

// We don't use sessions (stateless JWT app), but passport still needs these
// no-ops registered so passport.initialize() doesn't complain if session middleware
// is ever added later.
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/students/auth/google/callback',
    passReqToCallback: true // lets us read req.query.state to recover invite token / schoolId
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const googleEmail = profile.emails?.find(e => e.verified)?.value?.toLowerCase()
        || profile.emails?.[0]?.value?.toLowerCase();

      if (!googleEmail) {
        return done(null, false, { message: 'Your Google account has no accessible email address.' });
      }

      // state was base64url-encoded JSON set by initiateGoogleAuth (see student.controller.js)
      let state = {};
      if (req.query.state) {
        try {
          state = JSON.parse(Buffer.from(req.query.state, 'base64url').toString('utf8'));
        } catch (_) {
          return done(null, false, { message: 'Invalid or tampered OAuth state parameter.' });
        }
      }

      const user = await studentService.handleGoogleSignIn({
        googleEmail,
        googleId: profile.id,
        invitationToken: state.token,
        schoolId: state.schoolId
      });

      return done(null, user);
    } catch (err) {
      // err.message is safe to surface (thrown deliberately by the service layer)
      return done(null, false, { message: err.message || 'Google sign-in failed.' });
    }
  }
));

module.exports = passport;
