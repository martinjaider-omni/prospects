export function ApolloLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* A with triangle */}
      <path d="M0 19.5L8.5 0H12L20.5 19.5H16.5L14.8 15H5.7L4 19.5H0ZM10.25 4.5L6.8 12H13.7L10.25 4.5Z" />
      {/* Orange triangle accent */}
      <path fill="#FFB800" d="M8.5 0L10.25 4L12 0H8.5Z" />
      {/* p */}
      <path d="M23 19.5V5H26.5V7C27.5 5.5 29 4.5 31.5 4.5C35 4.5 38 7.5 38 12.25C38 17 35 20 31.5 20C29 20 27.5 19 26.5 17.5V24H23V19.5ZM30.5 7.5C28 7.5 26.5 9.5 26.5 12.25C26.5 15 28 17 30.5 17C33 17 34.5 15 34.5 12.25C34.5 9.5 33 7.5 30.5 7.5Z" />
      {/* o */}
      <path d="M40 12.25C40 7.5 43.5 4.5 48 4.5C52.5 4.5 56 7.5 56 12.25C56 17 52.5 20 48 20C43.5 20 40 17 40 12.25ZM48 7.5C45.5 7.5 43.5 9.5 43.5 12.25C43.5 15 45.5 17 48 17C50.5 17 52.5 15 52.5 12.25C52.5 9.5 50.5 7.5 48 7.5Z" />
      {/* l */}
      <path d="M59 19.5V0H62.5V19.5H59Z" />
      {/* l */}
      <path d="M66 19.5V0H69.5V19.5H66Z" />
      {/* o */}
      <path d="M73 12.25C73 7.5 76.5 4.5 81 4.5C85.5 4.5 89 7.5 89 12.25C89 17 85.5 20 81 20C76.5 20 73 17 73 12.25ZM81 7.5C78.5 7.5 76.5 9.5 76.5 12.25C76.5 15 78.5 17 81 17C83.5 17 85.5 15 85.5 12.25C85.5 9.5 83.5 7.5 81 7.5Z" />
      {/* .io dot */}
      <circle cx="94" cy="18" r="2.5" />
      {/* i */}
      <path d="M99 19.5V5H102.5V19.5H99Z" />
      <circle cx="100.75" cy="1.5" r="2" />
      {/* o */}
      <path d="M106 12.25C106 7.5 109.5 4.5 114 4.5C118.5 4.5 120 7.5 120 12.25C120 17 118.5 20 114 20C109.5 20 106 17 106 12.25ZM114 7.5C111.5 7.5 109.5 9.5 109.5 12.25C109.5 15 111.5 17 114 17C116.5 17 118.5 15 118.5 12.25C118.5 9.5 116.5 7.5 114 7.5Z" />
    </svg>
  )
}

export function ApolloIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* A with triangle - icon version */}
      <path d="M2 20L12 2L22 20H17L15 15.5H9L7 20H2ZM12 6L9.5 12H14.5L12 6Z" />
      {/* Orange triangle accent */}
      <path fill="#FFB800" d="M10.5 2L12 5L13.5 2H10.5Z" />
    </svg>
  )
}
