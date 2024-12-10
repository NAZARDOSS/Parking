export const fetchParkingFacilities = async () => {
  const url = `https://browse.search.hereapi.com/v1/browse?at=40.7483,-74.1376&categories=700-7600-0322&limit=3&show=ev`;

  const token = 'eyJhbGciOiJSUzUxMiIsImN0eSI6IkpXVCIsImlzcyI6IkhFUkUiLCJhaWQiOiJGZE5kOXpEN1ZBck52anhGOUNnUiIsImlhdCI6MTczMzU5MzgwMCwiZXhwIjoxNzMzNjgwMjAwLCJraWQiOiJqMSJ9.ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJRMEpETFVoVE5URXlJbjAuLk81Ty04RmdORGI1RURNOFI1M2VKMEEuQnltNjNoNEdWaVBtb1BlMEZZMlM3YTcyckpqdUFXOXpqYzRqeHVxNUROM0stSTBTdDZ0SS03RkdZV1JpQmdFSVJEQmIyNkF4dk9ZTlBlcnp0YzRxaWVUcE1rczZsaUM4ZldCUGZJaEZiSGR6SmdWdmFuTjkyWVdZeG42eGtSWWFSX3cxNnRRUmVrMzFsSlM4dlY5NHhEODFhZW94ajViazBHRV9wbElxZGpjLjZGOUNXRk9qeUlaSXUyY1hHME1KcEk1S2VtUDZKMUI2WUt4YjBxdkNVX2M.wXbi13WFFeK79knjEgScXorYx47mXxGzuVxozhgA0XbLFrouj9YlWe7VdJj3BQvX1sWeMuNd4Y1iwo6q2SdafV6Z4FwqeQkuSrw9xLp_tGlyiiiXq5LCJGgcMl1a75-SvxP74RWjp0FlsrGkZJyAFm-QEHk5bP2UtXIwCOuc0gn9_iCx_sRR9W2znL2fjwZAhAS9GF43urM_aOXDZLs4sui3qfTUftJuge36aftxrAZ9V8ywOfNSw2fiZIbjiQKjAaXCL-TH9gMaivkiqUULFBxnQGzSq7tHnO3mx1rwCYkrAQI1vU2_T2ADBTPd_lezc7ir7HH0UDlk90I8D22w5A';

  // const apiKey = 'U6EJBKlh1P9XNgkcy7ICYaT71wKsczzX9nJPTqdbQFI'; 
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
      console.log(data); // Обрабатываем полученные данные

  } catch (error) {
      console.error('Ошибка при запросе:', error);
  }
};