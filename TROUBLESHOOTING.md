Failed to get source map: [Error: chunk/module 'file:///Users/victoromos/Dropbox/IT/AUTOMATION/certifi-geo-drops-feat-connectToApi/.next/server/chunks/ssr/_bd35c7ee._.js' is missing a sourcemap

This was deleted from api.ts's API section

  updateClaimedAward: async (
    awardId: number,
    awardData: Partial<Award>
  ): Promise<ApiResponse<any>> => {
    const userId = awardData.userid || '';
    const claimed = 1;
    console.log("Update data prepared:", `/updateclaimedaward/${userId}/${awardId}/${claimed}`);
    return apiRequest(`/updateclaimedaward/${userId}/${awardId}/${claimed}`, {
      method: "GET",
    });
  },