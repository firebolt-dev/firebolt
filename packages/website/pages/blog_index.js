import { Link, css } from 'firebolt'

import { Page } from '../components/Page'
import { Image } from '../components/Image'

export default function Blog({ children }) {
  return (
    <Page width={700}>
      <div
        className='blog'
        css={css`
          padding: 50px 0;
          .blog-post {
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
          }
        `}
      >
        <Post
          url='/blog/introducing-firebolt'
          image='/introducing-firebolt.png'
          date='February 29, 2024'
          title='Introducing Firebolt: The Simple React Framework'
          description={`
            Building for the web should be easy...

            Unfortunately, modern web development has slowly become more and more complex and convoluted. The web has always just been the web, so why hasn't it become simpler? Why aren't we becoming more productive?
            
            Today i'm excited to publicly introduce Firebolt...
        `}
        />
      </div>
    </Page>
  )
}

function Post({ url, image, date, title, description }) {
  return (
    <Link href={url}>
      <div className='blog-post'>
        <img src={image} />
        <div className='blog-post-date'>{date}</div>
        <h2>{title}</h2>
        <p>
          {description} <span>Read more</span>
        </p>
      </div>
    </Link>
  )
}
