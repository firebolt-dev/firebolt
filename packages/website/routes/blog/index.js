import { Link, css } from 'firebolt'

import { Page } from '@/components/Page'
import { Image } from '@/components/Image'
import { Meta } from '@/components/Meta'

export default function Blog({ children }) {
  return (
    <Page width={900}>
      <div
        className='blog'
        css={css`
          padding: 50px 0;
          /* .blog-post {
            img {
              border-radius: 10px;
              margin: 0 0 12px;
            }
            &-date {
              font-style: italic;
              margin: 0 0 12px;
            }
            h2 {
              font-size: 38px;
              font-weight: 700;
              margin: 0 0 24px;
            }
            p {
              margin: 0 0 12px;
            }
            span {
              color: var(--primary-color);
            }
          } */
        `}
      >
        <Meta
          title='Blog'
          description='Blog posts from the Firebolt team about the future of web development.'
        />
        <Post
          url='/blog/introducing-firebolt'
          image='/introducing-firebolt.png'
          date='March 11, 2024'
          title='Introducing Firebolt: The Simple React Framework'
          description={`
            Building for the web should be easy...

            Unfortunately, modern web development has slowly become more and more complex and convoluted. The web has always just been the web...
        `}
        />
      </div>
    </Page>
  )
}

function Post({ url, image, date, title, description }) {
  return (
    <Link href={url}>
      <div
        className='post'
        css={css`
          display: flex;
          .post-image {
            width: 479px;
            margin: 0 30px 0 0;
            img {
              border-radius: 10px;
            }
          }
          .post-content {
            flex: 1;
          }
          .post-date {
            font-style: italic;
            margin: 0 0 12px;
          }
          .post-title {
            font-size: 34px;
            font-weight: 700;
            margin: 0 0 24px;
          }
          .post-more {
            color: var(--primary-color);
          }

          @media all and (max-width: 960px) {
            flex-direction: column;
            max-width: 600px;
            margin: 0 auto;
            .post-image {
              width: 100%;
              margin: 0 0 30px 0;
            }
          }
        `}
      >
        <div className='post-image'>
          <img src={image} />
        </div>
        <div className='post-content'>
          <div className='post-date'>{date}</div>
          <h2 className='post-title'>{title}</h2>
          <p>
            {description} <span className='post-more'>Read more</span>
          </p>
        </div>
      </div>
    </Link>
  )
}
