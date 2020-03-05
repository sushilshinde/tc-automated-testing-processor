module.exports = {
  apps: [
    {
      name: '#APP_NAME#',
      script: 'src/app.js',
      instances: 1,
      env: {
        KAFKA_URL: 'ssl://smooth-tricycle-01.srvs.cloudkafka.com:9093,ssl://smooth-tricycle-02.srvs.cloudkafka.com:9093,ssl://smooth-tricycle-03.srvs.cloudkafka.com:9093',
        GROUP_CONSUMER_NAME: '#GROUP_CONSUMER_NAME#',
        KAFKA_CLIENT_CERT:
          '-----BEGIN CERTIFICATE-----\nMIIDKTCCAhECCQCRciVWm9ZAQjANBgkqhkiG9w0BAQsFADAdMRswGQYDVQQDDBJz\nbW9vdGgtdHJpY3ljbGUgQ0EwHhcNMTcxMjIzMDUyMjMzWhcNMjcxMjIxMDUyMjMz\nWjCBjzELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAklMMREwDwYDVQQHDAhQYWxhdGlu\nZTERMA8GA1UECgwIVG9wY29kZXIxETAPBgNVBAsMCFByb2QvRGV2MRUwEwYDVQQD\nDAx0b3Bjb2Rlci5jb20xIzAhBgkqhkiG9w0BCQEWFG10d29tZXlAYmVha3N0YXIu\nY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0P9bydhMFMJYViPd\nvxQ8++NNLsBw/+HwgFTqVMAbtqMBnYd1oXtkzRRA0byvraC/ttq6vyUvZfs5lCX5\n7nCtVKCqjFCgqvbHuOHXciNzkYoxJTBOX3e5fXFU6wVXmrwFLYKTZBe43Jnm2e9B\nDRS+MtIKjVZo24kGy6oaQ/DD7vG0yewErDwCQMupP1qjeU120IXvp3Yj4wobXsLr\n3y4gpG7SSbXDCa72ETnzpUT7rRZ+jJCqIaqFBkBXsDOLpPOWlikiHaFv8B4kW8qP\nMhwY3rG3C4KVyOGdOdE00RNNWvDcns0AgaXCoJeJdURFpW2kt2qObEKmf5YfVdvg\nzhe0FQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQB/gLSBt6La0IJRUvrI68AgXIug\nUryvZV5uxZnxzuY8INSPY7YhLEeduPEJogxRwIezSDvKmqs47DJR/xfQmmToZT9j\nL/K6HojGtusvn1jtjB9dZPy6jozVET1XZLE/mloqZZg+d4JpjvLiheOuagCKlP4t\ncL8R1ipD+enzykEBebLGD0Z7o8yc6XNYFohnPvOX1MF1EpMssQ2ES7Eis1xJC7qo\nb7EWs1C45WBtoywMbaolFNSTC8Emg6oe0xWalHMJDc8saQ9G96YcCbbVUcEGMNH/\nF0iJ7r2JH59NOgs8O3g5Doh5BS13GJt8l/azJ6zzKfvPE8Ik0yJjUET2V++S\n-----END CERTIFICATE-----',
        KAFKA_CLIENT_CERT_KEY:
          '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDQ/1vJ2EwUwlhW\nI92/FDz7400uwHD/4fCAVOpUwBu2owGdh3Whe2TNFEDRvK+toL+22rq/JS9l+zmU\nJfnucK1UoKqMUKCq9se44ddyI3ORijElME5fd7l9cVTrBVeavAUtgpNkF7jcmebZ\n70ENFL4y0gqNVmjbiQbLqhpD8MPu8bTJ7ASsPAJAy6k/WqN5TXbQhe+ndiPjChte\nwuvfLiCkbtJJtcMJrvYROfOlRPutFn6MkKohqoUGQFewM4uk85aWKSIdoW/wHiRb\nyo8yHBjesbcLgpXI4Z050TTRE01a8NyezQCBpcKgl4l1REWlbaS3ao5sQqZ/lh9V\n2+DOF7QVAgMBAAECggEAa3dTGGgbPvVr/Oc2Z8GdVhxcHLUhpcHlK+f+EpQx6+jH\ntNvplZ5gh79pUS/H2ez1h63TJuSVCchzpAUfDgdsaT6wU7RF2YNJ0Xx3jx5Bl83K\nVYgQVLC4dZNoCe1WTZ9uvicNaQN1sCGG/fszpOlMn883U9Ph2TkNgH44QUU1StCa\nVPWxOOdUY3tFTX61nxfv3pHGuzQIEIscxASBftH6RoL+NaJ9HmJef7vsPS17VgKr\n9KG2Z8UlpdQv/2R3Ws74gQCVsAov2eG2W8WAX+jvy9uSdT6kr1HK+CLZMx6Zu3RA\nARFEAbZJ2SGnVXCl83O29WxiOCOLxzCTaFmexDesYQKBgQD02n0CjIAxrjdSn4bN\n9QICbaX81w9ZJGStbhWA1Myp+QqvesJFVJ/fz9vSo628c7UJAFJ6lXTPwJIEJ7/g\nFZc1EWH6otDzZGqfZbzOh7tm0Xq6kOFhks+yJ0vkn+zVBy1LR3RwJFSgDUFqSXpe\nuiglVOFOVNyvZWJE2a3ek5wx+QKBgQDagwGZiUE1vxNhCJXcDSjcFZ6RvnmnB0bN\nlMdLywF4q9o+UZnSZ0fTypVCFNHxR1P/hhOygrHPxvJyaLeQP3baWfZkg6KUqDEq\nmFuGsThOaGErClXFBOSlxL1pfTeaBJtY9sR7SLCTRsX+iuv+LeOga/f1kl4HARHx\n692cwOEZ/QKBgQDOJMTqyG+FZC+fmD9eVtCCSt5cqJN7cXBxsyTXelF1KP8eDjRR\nOpX/UHi6NqOm7aOVGHhYTEw0POSyKuUYPBU50JC0+y8AO6Ko4Ha9Svkz71lsiV23\nUGsciokSyrISCCDSKC6X236D4aUZXxNvfTsfcv7dfATwhmLdpIcFxTDTwQKBgCr4\niGABNemz4cO7RH05uUdOmRhgNNw7+hiDoY2uJmPsp8aJlY5i8SUdOaz9Gywvsr0V\nSNpaCU2q+hK1tSOQ13apKmMp39cMHF8cByO9xizlKfak2akdBTn0LquIDF8leMdN\n/+WerdrImDcuaqpZq+HoWaLZXdRSyYyhrbsd0yahAoGAHGECyzMR68qIFRRYZCVk\ng4Set4uM8b5oN7JS2TrWrwEQ5Sq/Aufmq3ytvc8Vv9MukMClX2x96T4Y2RlSBj6E\nDBzFGO9Z6me6oJiGrhspnu6vjtWevC2o1UEPEGR/QJCyoMlWGTCeXncaUwFgJeLR\nOiCpjQT+iZUMS7LVgDXvAbU=\n-----END PRIVATE KEY-----',
        AUTH0_AUDIENCE: 'https://www.topcoder.com/',
        AUTH0_CLIENT_ID: 'zYw8u52siLqHu7PmHODYndeIpD4vGe1R',
        AUTH0_CLIENT_SECRET:
          'nW8stN1a4WGMJ0GIg5uBGgef3GA6sz1TKxH5hjzrwAB-1fAZa2-MiSr2VarOQZNf',
        AUTH0_URL: 'https://topcoder.auth0.com/oauth/token',
        AUTH0_PROXY_SERVER_URL: 'https://auth0proxy.topcoder.com/token',

        SUBMISSION_API_URL: 'https://api.topcoder.com/v5',
        CHALLENGE_API_URL: 'https://api.topcoder.com/v3',

        REVIEW_TYPE_NAME: 'Marathon Match Review',
        BUSAPI_URL: 'https://api.topcoder.com/v5/bus/events',

        S3_BUCKET: 'topcoder-submission-artifacts',
        PROVISIONAL_TESTING_TIMEOUT: P0000000, // Default 2 hours
        FINAL_TESTING_TIMEOUT: S0000000, // Default 2 hours

        DOCKER_SOLUTION_MOUNT_PATH: '`${submissionPath}/code/src:/src`',
        CUSTOM_RUN_COMMAND: '`#CUSTOM_RUN_COMMAND#`',
        NODE_ENV: 'production',
        UI_TEST: true
      }
    }
  ]
}
