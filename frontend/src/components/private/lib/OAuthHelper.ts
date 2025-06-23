export const fetchParkingFacilities = async () => {
  const url = `https://browse.search.hereapi.com/v1/browse?at=40.7483,-74.1376&categories=700-7600-0322&limit=3&show=ev`;

  const token = 'eyJhbGciOiJSUzUxMiIsImN0eSI6IkpXVCIsImlzcyI6IkhFUkUiLCJhaWQiOiJGZE5kOXpEN1ZBck52anhGOUNnUiIsImlhdCI6MTczNzcxNDg0NiwiZXhwIjoxNzM3ODAxMjQ2LCJraWQiOiJqMSJ9.ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJRMEpETFVoVE5URXlJbjAuLmRPM2Q1NmczYUVPaVVBNlFlSThFcWcuSExTc1otd05sUEJzcFFBTndEQVBVcjRGMUtHRUZQRGZaVnVZdVN1Q05EOFpNeFVia1dacEFtVjZEeXZrYXZ6dktVOFdyV1g3cnJZZ1M5NHJuY1pxb0xGYV80bm5zM2d2UnVLcGE0bmVDbHQ1UHIxZGJwdkJOR1JuOFJSSHo0N1pmUDVxbFF3THRHRnZfUnZvclhTVkhfOFl4LXNBaDNROXV5eldyRXV1U040LkprR0VPb1JCMmRZSTJMWjE4ejZncnl6YUd0NDVTWWZmczRSNEVKSEU2SEk.XitRG_M4aJPwr0QUsvbS49fPsrO2QonzGXz0IK7Uhev7csakK9XkvNljE3abLwGZVfwKeQEFRVIPbNtEGeNLWznwY8dlEm0WynogK_Hnn4jNEdq5Xvrlh3-cBAzq2PJ-6px-RqamFP5CxbXVrtaIxfAEfu-I6MjiLRWoGEHs9UBTsjqKeeYQI5_oaBrte6THfG0c2ee_w8VxQNRLDqF9IRxEISldhTyNK7ndAu86C1HO42QMA3CShL-m-bw1OErRg-9Nm1c_BXyNYiA9YAV5RLzBnAsv-2fhyzWwyLsQrpZcJyDz2GBBWbEd-59b7yZvaXp1bkpsnPcLIo-7MgMZdg';

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