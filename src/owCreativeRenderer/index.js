import("prebid-universal-creative");

window.PWT = window.PWT || {};
window.ucTag = window.ucTag || {};

const typeString = "String";

export const isString = (object) => toString.call(object) === `[object ${typeString}]`;

// Desc: Uses prebid js render ad function to call cache and render ad based on the params from response.
// Param Definition 
export const renderCreative = (theDocument, params) => {
  if (params && params.cacheURL && params.uuid) {
    try {
      window.ucTag.renderAd(theDocument, {
        cacheHost: params.cacheURL,
        cachePath: params.cachePath,
        uuid: params.uuid,
        mediaType: "banner",
        size: params.size
      });
    } catch (e) {
      // Commenting below line due to es lint issue . TODO : Will have to check for rule to allow console.warn message
      // console.warn("OpenWrap Warning: There's an error rendering the ad.");
    }
  }
};

export const removeProtocolFromUrl = (url) => {
  if (isString(url)) {
    let outputUrl = url || "";
    if (url && url.length > 0) {
      outputUrl = url.replace(/^https{0,1}:\/\//i, "");
    }
    return outputUrl;
  }
  return "";
};

/// Change name to general render function : renderOWCreative
window.PWT.renderOWCreative = (theDocument, targetingKeys) => {
  if (targetingKeys) {
    let cacheid = targetingKeys.pwtcid || "";
    let cacheURL = targetingKeys.pwtcurl || "";
    let cachePath = targetingKeys.pwtcpath || "/cache";
    let size = targetingKeys.pwtsz || ""; // Assigning it empty string as per code review
    /* istanbul ignore else */
    if (cacheURL.length > 0 && cacheid.length > 0) {
      cacheURL = removeProtocolFromUrl(cacheURL); // removes protocol from url if present and returns host only
      renderCreative(theDocument, {
        cacheURL: cacheURL,
        cachePath: cachePath,
        uuid: cacheid,
        size: size
      });
    }
  } else {
    // Condition : Although the creative has won but it does not contain targeting keys required to render ad
    // error at dfp configuration.
    // Commenting below line due to es lint issue . TODO : Will have to check for rule to allow console.warn message
    // console.warn("OpenWrap Warning: No Targeting keys returned from adserver");
  }
};

/* start-test-block */
export const renderOWCreative = window.PWT.renderOWCreative;
/* end-test-block */