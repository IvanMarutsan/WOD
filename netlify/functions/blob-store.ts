import { getStore } from '@netlify/blobs';

export const getAdminStore = () => {
  return getStore({
    name: 'wod-admin',
    siteID: process.env.NETLIFY_BLOBS_SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN
  });
};
