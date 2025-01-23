export const fetchParkingFacilities = async () => {
  const url = `https://browse.search.hereapi.com/v1/browse?at=40.7483,-74.1376&categories=700-7600-0322&limit=3&show=ev`;

  const token = 'eyJhbGciOiJSUzUxMiIsImN0eSI6IkpXVCIsImlzcyI6IkhFUkUiLCJhaWQiOiJGZE5kOXpEN1ZBck52anhGOUNnUiIsImlhdCI6MTczNzY2NDYxNCwiZXhwIjoxNzM3NzUxMDE0LCJraWQiOiJqMSJ9.ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJRMEpETFVoVE5URXlJbjAuLmJwSVdqT0xUSWtvR0E1bGp0X2d1RGcuU01iVzB0LTNYS3N6b2NmZ0E3enFhNHFwVFFOUkxadDB4c0lOcUkySDlZRENTTUE2ZzVTSVhzR0pqXzNKX1p0OGRfV01PanpIdHBLYXE4WlJiUlFJSU5hbzVCU2tfbDFzSGZ0SkU1SzN3UTUtd0hOY3d2c2lDWHdzQXUwcHQ2RUJzc2pYa1ZxVXhQS1JpbkppTXk0T21ORXJyMDZ5NUNyYXFoaXhnTmJnSVRjLmIzQzB3dnlVUFhCRlYtQV92b0xkNjY5V0Fub1J1ZW96Uk9ibVBselBQUFE.jKhUDprBW6mpJKETG4twVmzxjDIzPDiXBUKU7UJfoHKJBBxyWcmnHO7J7nU3iDFRVsVEvTV8Ohf9ZtG0HLldRFUIQ-TS33uzjXlkT76ZZSNxvFDFyuuwErnbDInBF195JkaRQiIimSynGQ7sKZZFIHwTRuJvY7zHkvmwRRmCmmOtJui5EdbLQbS4U-9_l5zChLUSLVaL7gHBqW3CtcnVXML0bYq155TzybPYDnWAaqZ09ftcOIdujTHqAOKku8Vy_EDw88HKmD3yq1oIZWKsc0N2rqWn24VqtlFVXoR2a98-UWTZq5OrBO6UtWd5jFCjotoF3htAOSkS1m3QsffzQQ';

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