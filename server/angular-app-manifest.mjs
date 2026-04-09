
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/sportiva-booking-angular/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/sportiva-booking-angular/home",
    "route": "/sportiva-booking-angular"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/login"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/home"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/about"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/signup"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/reset-password"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/profile"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/management-clients"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/add-sport-centre"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/add-profesional-to-center"
  },
  {
    "renderMode": 2,
    "route": "/sportiva-booking-angular/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 29085, hash: '9d3b63d3d588f50726bb9e56d1ae75f6d68a13b21454dad3546f007057a8f5b1', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17204, hash: '6d83002a5a0c4abb136620880fee5b536a60da9b1d3974395cd11f0f6da336e3', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'profile/index.html': {size: 32212, hash: '62486ecc74ed537c0d76eb2aa0082ccfc9976dfae959937411ce35bd5d91845e', text: () => import('./assets-chunks/profile_index_html.mjs').then(m => m.default)},
    'management-clients/index.html': {size: 34433, hash: '844db16192cdb1212e168a114a33eef65e60d2cf1b41371df4ced08040f06948', text: () => import('./assets-chunks/management-clients_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 46166, hash: 'cd14dfd383633c80b99df8a71910278ba0a02eaf06301172d67cf3a48f43799e', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'signup/index.html': {size: 47054, hash: '24a3cdbe91331ac5ea3c48129b6ad2fba3c9f4b5957a04bd9d86e6a2f2149d59', text: () => import('./assets-chunks/signup_index_html.mjs').then(m => m.default)},
    'add-profesional-to-center/index.html': {size: 34477, hash: '50018d36bbb53e5b1844b3350c7676c7eec72ed5d15f1f8e0a6cea42ea3f6baa', text: () => import('./assets-chunks/add-profesional-to-center_index_html.mjs').then(m => m.default)},
    'add-sport-centre/index.html': {size: 52237, hash: 'de187e4c344cca005751afb7f2be7334fdd4d329143e18851cce37c0ae502e53', text: () => import('./assets-chunks/add-sport-centre_index_html.mjs').then(m => m.default)},
    'reset-password/index.html': {size: 40755, hash: '1d62781efd7adad3fd61abfe81f0ae79cbc393ec4ee56d20dd80f345709b8620', text: () => import('./assets-chunks/reset-password_index_html.mjs').then(m => m.default)},
    'home/index.html': {size: 49727, hash: '7bc27b71ed257a8ed59a229056f9db21f6a3f169ac80d79027cf253558176fbe', text: () => import('./assets-chunks/home_index_html.mjs').then(m => m.default)},
    'about/index.html': {size: 36376, hash: 'd83196a6e90075b9e7e79ca2166be5d0e62448665650a9b662e733cd02ce907c', text: () => import('./assets-chunks/about_index_html.mjs').then(m => m.default)},
    'styles-2GW7OCOV.css': {size: 324414, hash: 'OWihmQLxv9A', text: () => import('./assets-chunks/styles-2GW7OCOV_css.mjs').then(m => m.default)}
  },
};
