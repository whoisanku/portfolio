interface PublicationCardProps {
  post: any;
}

export function PublicationCard({ post }: PublicationCardProps) {
  const { author, record } = post;

  return (
    <article className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <div className="text-gray-400 text-sm mb-2">
        {author.displayName} (@{author.handle})
      </div>
      <div className="mb-4">
        <p className="text-white mb-4">{record.text}</p>
        {record.embed?.images?.[0] && (
          <img
            src={record.embed.images[0].fullsize}
            alt="Post image"
            className="w-full h-auto rounded-lg mb-4"
          />
        )}
      </div>
    </article>
  );
}
