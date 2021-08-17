import { Document, HookNextFunction, model, Schema } from 'mongoose';

export interface IAffiliateLink extends Document {
  affiliateId: string;
  pageUrl: string;
  name: string;
  brand: string;
  userId: string;
  fullUrl: string;
  bitlyLink: string;
}

export const affiliateLinkSchema = new Schema(
  {
    affiliateId: { type: String, unique: true, index: true, trim: true },
    pageUrl: String,
    name: String,
    brand: String,
    userId: String,
    fullUrl: String,
    bitlyLink: String,
  },
  { id: false },
);

affiliateLinkSchema.post('save', async function(
  affiliateLink: IAffiliateLink,
  next: HookNextFunction,
) {
  setAffiliateId(affiliateLink, next);
});

affiliateLinkSchema.post('insertMany', async function(
  affiliateLink: IAffiliateLink,
  next: HookNextFunction,
) {
  setAffiliateId(affiliateLink, next);
});

function setAffiliateId(affiliateLink: IAffiliateLink, next: HookNextFunction) {
  if (!affiliateLink._id) {
    return;
  }

  const id = affiliateLink._id.toString();

  if (affiliateLink.affiliateId !== id) {
    affiliateLink.affiliateId = id;

    try {
      affiliateLink.save();
    } catch (err) {
      next(err);
    }
  }
}

const AffiliateLink = model<IAffiliateLink>('affiliate-link', affiliateLinkSchema);

export default AffiliateLink;
