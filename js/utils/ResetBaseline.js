function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

export function createResetBaselineController() {
  let baseline = null;

  function setBaseline(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    baseline = cloneData(snapshot);
    return true;
  }

  function getBaseline() {
    return baseline ? cloneData(baseline) : null;
  }

  function hasBaseline() {
    return !!baseline;
  }

  function restoreBaseline() {
    return getBaseline();
  }

  return {
    setBaseline,
    getBaseline,
    hasBaseline,
    restoreBaseline
  };
}
