export const fetchParkingFacilities = async () => {
  const url = `https://browse.search.hereapi.com/v1/browse?at=40.7483,-74.1376&categories=700-7600-0322&limit=3&show=ev`;

  const token = 'eyJhbGciOiJSUzUxMiIsImN0eSI6IkpXVCIsImlzcyI6IkhFUkUiLCJhaWQiOiJGZE5kOXpEN1ZBck52anhGOUNnUiIsImlhdCI6MTczNDI1NTI0NSwiZXhwIjoxNzM0MzQxNjQ1LCJraWQiOiJqMSJ9.ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJRMEpETFVoVE5URXlJbjAuLkxWSHVGVVd0V3BLNTdOdUtZelVZbWcueHM1NV9iZG5WeW91cGI1aE5xdWs4X2lHVXFUV3pCWG1LbGNEUlNnX1RzandKWV9WX1pyNF9vQmt0M1lLcXVycTlaQURoSzljVjcxOVdEa1l0blRuU2s0TElLN2ZFcDFkc29tWThQZ0ZPR3JlblpScXNVUHdFTWJVRHA3Ul9sb3BWR2pmMEJRUWlDcFhZQkZ0OGxfZVVrSjVmTGpjVzR0UlMxeDR4UnNCZDFZLmZqRWMtcFdQUU1oM3pjbTMwb19JQmdiSTM2XzFYTnRFMzFGOUpUa2FYWUE.ZAx42XnDunmALhuT48SsBnVnxVnxJpv-n_Ws2X6OZ0lbbg681gpRm7NwKzRc90tyObVGE1VWhebbI0I0yDsMZIWVhf7bprsfl7HubPhxFT0jPcmjby8DsR2M9E9rk7cNnr1U50rSENNWWH7sMurdu41biHInVVb8j9Zgx8AzFuU2E1TAptwmo4DpZ-XCiYRGALhBQ45YRljMN4twh4eoDWaEegB5MNROJolaOfztg4z5vGvowYMIsgUEclQs1dBJl8QR84BdnoaK1wYz8XrERAmu2iphoVOy0pShDQWSP5fl0ctOIuLA1iDmYzEZy72rqXULL5xUreYOzCiae8dwlg';

  try {
      const response = await fetch(`${url}`, {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${token}`,
          },
      });

      if (!response.ok) {
          throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log(data);
  } catch (error) {
      console.error('Ошибка при запросе:', error);
  }
};